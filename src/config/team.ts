/**
 * Configuração da equipe de vendas
 * 
 * Closers atuais:
 * - Yan
 * - Matheus  
 * - Larissa
 * - Lucas
 * 
 * Nota: Os closers precisam criar contas no sistema e serem 
 * atribuídos à role "closer" na tabela user_roles para aparecerem
 * na lista de seleção ao mover leads para colunas de closer.
 */

export const TEAM_CONFIG = {
  closers: [
    { name: 'Yan', email: '' },
    { name: 'Matheus', email: '' },
    { name: 'Larissa', email: '' },
    { name: 'Lucas', email: '' },
  ],
  sdrs: [],
} as const;

// Esta constante é apenas para referência.
// Os closers reais são obtidos da tabela profiles + user_roles do banco de dados.
