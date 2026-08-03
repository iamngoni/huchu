import { z } from "zod";

/**
 * Files that belong to a record.
 *
 * The CRM could already raise a quote and could already photograph a site
 * visit, and between those two there was nowhere to put the signed contract,
 * the tax clearance certificate or the scan of the customer's purchase order.
 * Those arrived by email and stayed there, which is to say they were held by
 * whoever happened to receive them.
 *
 * The owner is one nullable column per kind rather than an `entity` string
 * and an id, so the database enforces that the record exists and cascades a
 * delete. It costs a wider table and buys the guarantee that no file survives
 * the record it describes.
 */

export const FILE_OWNERS = ["lead", "deal", "company", "person", "site", "rep"] as const;
export type FileOwnerKind = (typeof FILE_OWNERS)[number];

export type FileOwner = { kind: FileOwnerKind; id: string };

export const fileOwnerSchema = z.object({
  owner: z.enum(FILE_OWNERS),
  ownerId: z.string().uuid(),
});

export const recordFileSchema = z.object({
  owner: z.enum(FILE_OWNERS),
  ownerId: z.string().uuid(),
  name: z.string().trim().min(1).max(300),
  url: z.string().trim().url().max(2000),
  size: z.number().int().min(0).max(2_000_000_000).nullish(),
  contentType: z.string().trim().max(200).nullish(),
  note: z.string().trim().max(500).nullish(),
});

export type RecordFileInput = z.infer<typeof recordFileSchema>;

/**
 * The column this owner writes to.
 *
 * A rep is a User rather than a CRM record — the profile page is a person who
 * works here, not a person we sell to — so it gets its own column instead of
 * being squeezed into `personId` and quietly colliding with a customer contact
 * of the same name.
 */
export function ownerColumn(owner: FileOwnerKind): string {
  switch (owner) {
    case "lead":
      return "leadId";
    case "deal":
      return "dealId";
    case "company":
      return "clientId";
    case "person":
      return "personId";
    case "site":
      return "siteId";
    case "rep":
      return "userId";
  }
}

/** The `where`/`data` fragment for one owner. Always exactly one column set. */
export function ownerWhere(owner: FileOwner): Record<string, string> {
  return { [ownerColumn(owner.kind)]: owner.id };
}
