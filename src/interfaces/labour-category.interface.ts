interface IndustriesInterface {
  id: string;
  name: string;
  ref_id: string;
  program_id: string;
  is_enabled: boolean | string;
  page?: string;
  limit?: string;
  modified_on?:number;
}


export { IndustriesInterface, };