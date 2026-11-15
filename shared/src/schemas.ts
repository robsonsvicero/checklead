import { z } from 'zod';

export const LeadOrigemEnum = z.enum(['Instagram', 'indicação', 'site', 'outro']);
export const LeadStatusEnum = z.enum(['novo', 'orcamento_enviado', 'fechado', 'perdido']);
export const InteracaoTipoEnum = z.enum(['contato', 'orcamento', 'follow_up', 'nota']);

export const CriarLeadSchema = z.object({
  nome: z.string().trim().min(2, 'O nome deve ter pelo menos 2 caracteres'),
  whatsapp: z.string().trim().nullable().optional(),
  email: z.string().trim().nullable().optional(),
  contato: z.string().trim().optional(),
  responsavel: z.string().trim().nullable().optional(),
  servico: z.string().trim().min(2, 'Informe o serviço desejado'),
  origem: LeadOrigemEnum.default('outro'),
  valor_estimado: z.number().int().nonnegative('O valor estimado deve ser positivo ou zero'), // em centavos
  proxima_acao_em: z.string().datetime().nullable().optional()
}).refine(data => (data.whatsapp && data.whatsapp.trim().length > 0) || (data.email && data.email.trim().length > 0) || (data.contato && data.contato.trim().length > 0), {
  message: 'Informe pelo menos um contato (WhatsApp ou E-mail)',
  path: ['whatsapp']
});

export type CriarLeadDTO = z.infer<typeof CriarLeadSchema>;

export const AtualizarLeadSchema = z.object({
  nome: z.string().trim().min(2).optional(),
  whatsapp: z.string().trim().nullable().optional(),
  email: z.string().trim().nullable().optional(),
  contato: z.string().trim().optional(),
  responsavel: z.string().trim().nullable().optional(),
  servico: z.string().trim().min(2).optional(),
  origem: LeadOrigemEnum.optional(),
  valor_estimado: z.number().int().nonnegative().optional(),
  status: LeadStatusEnum.optional(),
  motivo_perda: z.string().trim().nullable().optional(),
  proxima_acao_em: z.string().datetime().nullable().optional()
});

export type AtualizarLeadDTO = z.infer<typeof AtualizarLeadSchema>;

export const AcaoLeadSchema = z.discriminatedUnion('tipo', [
  z.object({
    tipo: z.literal('contato'),
    texto: z.string().trim().optional()
  }),
  z.object({
    tipo: z.literal('orcamento'),
    texto: z.string().trim().optional()
  }),
  z.object({
    tipo: z.literal('follow_up'),
    texto: z.string().trim().optional()
  }),
  z.object({
    tipo: z.literal('fechou'),
    texto: z.string().trim().optional()
  }),
  z.object({
    tipo: z.literal('perdeu'),
    motivo_perda: z.string().trim().min(2, 'Informe o motivo da perda'),
    texto: z.string().trim().optional()
  }),
  z.object({
    tipo: z.literal('nota'),
    texto: z.string().trim().min(1, 'O texto da nota não pode ser vazio')
  })
]);

export type AcaoLeadDTO = z.infer<typeof AcaoLeadSchema>;

export const ConfiguracaoSchema = z.object({
  limite_sem_resposta_horas: z.number().int().min(1, 'Deve ser no mínimo 1 hora').max(720),
  limite_follow_up_dias: z.number().int().min(1, 'Deve ser no mínimo 1 dia').max(90),
  limite_lead_parado_dias: z.number().int().min(1, 'Deve ser no mínimo 1 dia').max(180)
});

export type ConfiguracaoDTO = z.infer<typeof ConfiguracaoSchema>;

export const SetupSenhaSchema = z.object({
  senha: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres')
});

export const LoginSchema = z.object({
  senha: z.string().min(1, 'Informe a senha')
});

export const EmailLoginSchema = z.object({
  email: z.string().trim().email('Informe um e-mail válido'),
  senha: z.string().min(1, 'Informe a senha')
});

export const InviteEmailSchema = z.object({
  email: z.string().trim().email('Informe um e-mail válido').transform(email => email.toLowerCase())
});

export const CompleteInvitationSchema = z.object({
  accessToken: z.string().min(20),
  refreshToken: z.string().min(1),
  novaSenha: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres')
});

export const AlterarSenhaSchema = z.object({
  novaSenha: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres')
});

export const TrocarSenhaSchema = z.object({
  senhaAtual: z.string().min(1, 'Informe a senha atual'),
  novaSenha: z.string().min(6, 'A nova senha deve ter pelo menos 6 caracteres')
});
