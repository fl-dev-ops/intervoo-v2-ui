// Single source of truth for the selectable roles in the job-preferences form.
// The API has no roles endpoint, so this constant backs the Role dropdown
// everywhere (onboarding + /jobs). Users can still type a custom role.
export const JOB_ROLE_OPTIONS: string[] = [
  "Software Engineer",
  "Frontend Engineer",
  "Backend Engineer",
  "Full Stack Engineer",
  "Machine Learning Engineer",
  "Data Scientist",
  "Data Engineer",
  "DevOps Engineer",
  "Mobile Engineer",
  "QA Engineer",
  "Engineering Manager",
  "Product Manager",
  "UI/UX Designer",
];
