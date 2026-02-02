import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { CheckCircle, Loader2 } from 'lucide-react';

const leadSchema = z.object({
  full_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  phone: z.string().min(10, 'Telefone inválido').max(20),
  email: z.string().email('E-mail inválido').max(255),
  company_name: z.string().min(2, 'Empresa é obrigatória').max(200),
  franchise_count: z.string().optional(),
});

export default function EmbedFormPage() {
  // Create an anonymous supabase client (without existing session)
  // This ensures inserts go through the 'anon' role, not 'authenticated'
  const anonSupabase = useMemo(() => {
    return createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        }
      }
    );
  }, []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    company_name: '',
    franchise_count: '',
  });

  // Capture UTM parameters from URL
  const getUTMParams = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source') || undefined,
      utm_medium: params.get('utm_medium') || undefined,
      utm_campaign: params.get('utm_campaign') || undefined,
      utm_content: params.get('utm_content') || undefined,
      utm_term: params.get('utm_term') || undefined,
    };
  };

  // Make body transparent for iframe embedding
  useEffect(() => {
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    
    return () => {
      document.documentElement.style.background = '';
      document.body.style.background = '';
    };
  }, []);

  // Notify parent window of form height for responsive iframe
  useEffect(() => {
    const sendHeight = () => {
      const height = document.body.scrollHeight;
      window.parent.postMessage({ type: 'embed-form-height', height }, '*');
    };
    
    sendHeight();
    window.addEventListener('resize', sendHeight);
    return () => window.removeEventListener('resize', sendHeight);
  }, [isSubmitted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = leadSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    const utmParams = getUTMParams();
    
    // Build notes with franchise count if provided
    const notes = formData.franchise_count 
      ? `Número de Franquias: ${formData.franchise_count}` 
      : undefined;

    const { error } = await anonSupabase.from('leads').insert({
      full_name: formData.full_name,
      email: formData.email,
      phone: formData.phone,
      company_name: formData.company_name,
      funnel_type: 'franquia',
      company: 'escola_franchising',
      status: 'sem_atendimento',
      notes,
      ...utmParams,
    });

    setIsSubmitting(false);

    if (error) {
      console.error('Error submitting lead:', error);
      setErrors({ form: 'Ocorreu um erro ao enviar. Tente novamente.' });
      return;
    }

    setIsSubmitted(true);
    
    // Notify parent of successful submission
    window.parent.postMessage({ type: 'embed-form-submitted', success: true }, '*');
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/20">
          <CheckCircle className="h-7 w-7 text-green-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Cadastro Realizado!</h2>
        <p className="text-white/70 text-sm">
          Nossa equipe entrará em contato em breve.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Nome */}
        <div>
          <input
            type="text"
            placeholder="Nome *"
            value={formData.full_name}
            onChange={e => setFormData(d => ({ ...d, full_name: e.target.value }))}
            className="w-full px-4 py-3 bg-black/40 backdrop-blur-sm border border-white/20 rounded-md text-white placeholder:text-white/50 focus:outline-none focus:border-[#c4ae6b] transition-colors"
          />
          {errors.full_name && (
            <p className="text-sm text-red-400 mt-1">{errors.full_name}</p>
          )}
        </div>

        {/* Telefone */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-white/70">
            <span className="text-lg">🇧🇷</span>
            <span className="text-sm">+55</span>
          </div>
          <input
            type="tel"
            placeholder="(00) 00000-0000"
            value={formData.phone}
            onChange={e => setFormData(d => ({ ...d, phone: formatPhone(e.target.value) }))}
            maxLength={15}
            className="w-full pl-20 pr-4 py-3 bg-black/40 backdrop-blur-sm border border-white/20 rounded-md text-white placeholder:text-white/50 focus:outline-none focus:border-[#c4ae6b] transition-colors"
          />
          {errors.phone && (
            <p className="text-sm text-red-400 mt-1">{errors.phone}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <input
            type="email"
            placeholder="E-mail *"
            value={formData.email}
            onChange={e => setFormData(d => ({ ...d, email: e.target.value }))}
            className="w-full px-4 py-3 bg-black/40 backdrop-blur-sm border border-white/20 rounded-md text-white placeholder:text-white/50 focus:outline-none focus:border-[#c4ae6b] transition-colors"
          />
          {errors.email && (
            <p className="text-sm text-red-400 mt-1">{errors.email}</p>
          )}
        </div>

        {/* Empresa */}
        <div>
          <input
            type="text"
            placeholder="Empresa *"
            value={formData.company_name}
            onChange={e => setFormData(d => ({ ...d, company_name: e.target.value }))}
            className="w-full px-4 py-3 bg-black/40 backdrop-blur-sm border border-white/20 rounded-md text-white placeholder:text-white/50 focus:outline-none focus:border-[#c4ae6b] transition-colors"
          />
          {errors.company_name && (
            <p className="text-sm text-red-400 mt-1">{errors.company_name}</p>
          )}
        </div>

        {/* Número de Franquias */}
        <div>
          <input
            type="number"
            placeholder="Número de Franquias *"
            value={formData.franchise_count}
            onChange={e => setFormData(d => ({ ...d, franchise_count: e.target.value }))}
            min="0"
            className="w-full px-4 py-3 bg-black/40 backdrop-blur-sm border border-white/20 rounded-md text-white placeholder:text-white/50 focus:outline-none focus:border-[#c4ae6b] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>

        {/* Error message */}
        {errors.form && (
          <p className="text-sm text-red-400 text-center">{errors.form}</p>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 px-4 bg-gradient-to-r from-[#c4ae6b] to-[#a08a4e] hover:from-[#d4be7b] hover:to-[#b09a5e] text-black font-semibold rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            'Enviar Cadastro'
          )}
        </button>
      </form>
    </div>
  );
}
