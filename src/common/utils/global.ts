export const versionStructure = (packageName: string, env: string, version: string) => {
  return `${packageName} v=${env}-${version}`;
};
