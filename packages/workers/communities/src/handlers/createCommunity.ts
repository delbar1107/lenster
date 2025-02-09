import validateLensAccount from '@lenster/lib/validateLensAccount';
import { createClient } from '@supabase/supabase-js';
import { error, type IRequest } from 'itty-router';
import { object, string } from 'zod';

import { COMMUNITIES_TABLE } from '../constants';
import type { Env } from '../types';

type ExtensionRequest = {
  name: string;
  slug: string;
  description?: string;
  image?: string;
  accessToken: string;
};

const validationSchema = object({
  name: string().min(1, { message: 'Name is required!' }),
  slug: string().min(1, { message: 'Slug is required!' }),
  description: string().optional().nullable(),
  image: string().optional().nullable(),
  accessToken: string().regex(/^([\w=]+)\.([\w=]+)\.([\w+/=\-]*)/)
});

export default async (request: IRequest, env: Env) => {
  const body = await request.json();
  if (!body) {
    return error(400, 'Bad request!');
  }

  const validation = validationSchema.safeParse(body);

  if (!validation.success) {
    return new Response(
      JSON.stringify({ success: false, error: validation.error.issues })
    );
  }

  const { name, slug, description, image, accessToken } =
    body as ExtensionRequest;

  try {
    const isAuthenticated = await validateLensAccount(accessToken, true);
    if (!isAuthenticated) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid access token!' })
      );
    }

    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);

    const { data, error } = await supabase
      .from(COMMUNITIES_TABLE)
      .insert({ name, slug, description, image })
      .select();

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify(data));
  } catch (error) {
    console.error('Failed to create metadata data', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Something went wrong!' })
    );
  }
};
