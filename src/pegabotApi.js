import axios from 'axios';

async function getResult(profile) {
    const pegabotAPI = process.env.PEGABOT_API;
  
    const searchParams = {
      socialnetwork: 'twitter',
      search_for: 'profile',
      limit: 1,
      authenticated: false,
      profile,
      getData: true,
      is_admin: true,
    };
  
    try {
      const result = await axios({ url: `${pegabotAPI}/botometer`, method: 'get', params: searchParams, timeout: 10000 });

      if (!result) throw new Error('Não houve resposta da api');
      if (Array.isArray(result.data) && result.data.length === 0) throw new Error('Parece que usuário não tem tweets na timeline');
  
      return result.data;
    } catch (error) {
      console.error('Erro ao buscar handle: ' + error);
      const msg = handleRequestError(error);
      return { error, msg, searchParams };
    }
}

function handleRequestError(error) {
    const response = error.response ? error.response : {};
    const { data } = response;
  
    if (!data || !data.metadata) return error.toString();
  
    let erro = data.metadata.error[0] || {};
    if (erro.code === 34) return 'Esse usuário não existe';
    if (erro.code === 88) return 'Chegamos no rate limit';
  
    erro = data.metadata.error || {};
    if (erro.request === '/1.1/statuses/user_timeline.json' && erro.error === 'Not authorized.') return 'Sem permissão para acessar. Usuário pode estar bloqueado/suspendido.';
  
    if (data && JSON.stringify(data)) return JSON.stringify(data);
    return 'Erro da api desconhecido';
}

export default {
    getResult
}