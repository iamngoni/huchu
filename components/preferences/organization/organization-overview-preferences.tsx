"use client";

import { useQuery } from "@tanstack/react-query";
import { Alert, Badge, Card, Skeleton } from "@corelithzw/react";

import { getApiErrorMessage } from "@/lib/api-client";
import { fetchPreferencesProfile } from "@/lib/preferences/api";

export function OrganizationOverviewPreferences() {
  const profileQuery = useQuery({
    queryKey: ["preferences", "profile"],
    queryFn: fetchPreferencesProfile,
  });

  if (profileQuery.isLoading) {
    return (
      <Card>
        <Card.Body>
          <Skeleton lines={6} gap={8} />
        </Card.Body>
      </Card>
    );
  }

  if (profileQuery.error || !profileQuery.data) {
    return (
      <Alert tone="danger" title="Unable to load organization">
        {getApiErrorMessage(profileQuery.error)}
      </Alert>
    );
  }

  const { company } = profileQuery.data;

  return (
    <Card>
      <Card.Header>
        <Card.Title>Workspace context</Card.Title>
      </Card.Header>
      <Card.Body>
        <div className="settings-section">
          <div className="settings-row">
            <div>
              <div className="t-label-sm">Organization name</div>
              <p className="t-caption t-muted">The name shown across workspace surfaces.</p>
            </div>
            <span>{company.name}</span>
          </div>
          <div className="settings-row">
            <div>
              <div className="t-label-sm">Workspace slug</div>
              <p className="t-caption t-muted">Used in hosted workspace identity and support context.</p>
            </div>
            <span className="t-mono">{company.slug}</span>
          </div>
          <div className="settings-row">
            <div>
              <div className="t-label-sm">Workspace profile</div>
              <p className="t-caption t-muted">Controls role templates and module defaults.</p>
            </div>
            <Badge tone="outline">{company.workspaceProfile}</Badge>
          </div>
          <div className="settings-row">
            <div>
              <div className="t-label-sm">Tenant status</div>
              <p className="t-caption t-muted">Billing and access enforcement use this state.</p>
            </div>
            <Badge tone={company.tenantStatus === "ACTIVE" ? "success" : "warn"}>
              {company.tenantStatus}
            </Badge>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}
