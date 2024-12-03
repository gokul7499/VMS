interface EventInterface {
  name: string;
  slug: string;
  module_id: string;
  is_enabled: boolean | string;
  is_deleted: boolean;
  created_on: string;
  type: string;
}
export default EventInterface;
