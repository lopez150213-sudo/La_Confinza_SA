import { createClient } from '@supabase/supabase-js';

// Inicializar cliente usando las variables de entorno de Vercel
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // Habilitar CORS para permitir solicitudes desde el frontend
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // GET: Obtener la lista de pedidos de Supabase
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // POST: Registrar un nuevo pedido en Supabase
  if (req.method === 'POST') {
    try {
      const nuevoPedido = req.body;

      const { data, error } = await supabase
        .from('pedidos')
        .insert([nuevoPedido])
        .select();

      if (error) throw error;

      return res.status(201).json({ message: 'Pedido guardado con éxito', data });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
