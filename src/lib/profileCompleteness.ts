export interface ChildProfile {
  name?: string | null;
  email?: string | null;
}

export interface MissingFields {
  parentName: boolean;
  childEmail: boolean;
}

export function computeMissingFields(
  parentName: string | null | undefined,
  child?: ChildProfile | null,
): MissingFields {
  return {
    parentName: !parentName,
    childEmail: !child?.email,
  };
}

export function hasMissingFields(missing: MissingFields): boolean {
  return Object.values(missing).some(Boolean);
}
