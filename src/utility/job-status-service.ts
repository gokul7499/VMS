
import axios from 'axios';

export const updateJob = async (
  id: string,
  program_id: string,
  status:string,
  token:string
): Promise<any> => {
  try {
    const response = await axios.put(
      `http://v4-qanlb.simplifysandbox.net:8002/sourcing/v1/api/program/${program_id}/job/${id}`,
      { status: status, modified_on: Date.now() },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization':`Bearer ${token}`
        },
      }
    );
    console.log('Job status updated successfully:', response);
    return response.data;
  } catch (error: any) {
    console.log(error.message);
  }
};


export default updateJob;
