type TemplateNormalizer = (template: string) => string;

export function createBundledTemplateLoader(rawTemplate: string, normalize: TemplateNormalizer) {
  const normalizedTemplate = normalize(rawTemplate);

  return async function loadBundledTemplate() {
    return normalizedTemplate;
  };
}
