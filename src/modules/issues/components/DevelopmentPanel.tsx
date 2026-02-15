"use client";
/**
 * Development panel showing GitHub links for an issue.
 * @module issues/components/DevelopmentPanel
 */
import { GitBranch, GitCommit, GitPullRequest, ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

interface GitHubLink {
  id: string;
  resourceType: "pull_request" | "branch" | "commit";
  owner: string;
  repo: string;
  number: number | null;
  sha: string | null;
  branch: string | null;
  state: string | null;
  url: string | null;
  createdAt: string;
}

interface DevelopmentPanelProps {
  links: GitHubLink[];
  onDeleteLink?: (linkId: string) => void;
}

const iconMap = {
  pull_request: GitPullRequest,
  branch: GitBranch,
  commit: GitCommit,
} as const;

const labelMap = {
  pull_request: "Pull Requests",
  branch: "Branches",
  commit: "Commits",
} as const;

export function DevelopmentPanel({ links, onDeleteLink }: DevelopmentPanelProps) {
  if (links.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">
        No development activity linked to this issue.
      </div>
    );
  }

  const grouped = links.reduce<Record<string, GitHubLink[]>>((acc, link) => {
    const key = link.resourceType;
    if (!acc[key]) acc[key] = [];
    acc[key].push(link);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {(Object.entries(grouped) as [keyof typeof labelMap, GitHubLink[]][]).map(([type, items]) => {
        const Icon = iconMap[type];
        return (
          <div key={type}>
            <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
              <Icon className="h-4 w-4" />
              {labelMap[type]} ({items.length})
            </h4>
            <ul className="space-y-1">
              {items.map((link) => (
                <li key={link.id} className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-muted/50">
                  <span className="flex items-center gap-2 truncate">
                    {link.resourceType === "pull_request" && `#${link.number}`}
                    {link.resourceType === "commit" && link.sha?.slice(0, 7)}
                    {link.resourceType === "branch" && link.branch}
                    <span className="text-muted-foreground truncate">
                      {link.owner}/{link.repo}
                    </span>
                    {link.state && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        link.state === "open" ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" :
                        link.state === "merged" ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" :
                        "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                      }`}>
                        {link.state}
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-1 shrink-0">
                    {link.url && (
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {onDeleteLink && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDeleteLink(link.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
