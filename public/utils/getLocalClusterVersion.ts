import { getRouteService } from '../service';

export const getLocalClusterVersion = async (): Promise<string | undefined> => {
  try {
    const response = await getRouteService().post('/api/console/proxy', {
      query: {
        path: '/',
        method: 'GET',
        dataSourceId: '', // explicitly local cluster
      },
    });
    return response?.version?.number;
  } catch (e) {
    console.error('Failed to fetch local cluster version', e);
    return undefined;
  }
};
