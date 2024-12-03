interface GlobalConfigInterface {
  name: string,
  slug: string,
  is_enabled: boolean,
  page?: string;
  limit?: string;
}
export default GlobalConfigInterface;
