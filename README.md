# 🌐 SkillHub

**SkillHub** é uma plataforma web desenvolvida para conectar pessoas e empresas por meio da oferta e solicitação de serviços dentro de uma comunidade — uma espécie de **rede social profissional colaborativa**, inspirada no LinkedIn, mas com foco em interações locais e oportunidades diretas entre usuários.

---

## 🚀 Objetivo do Projeto

O projeto foi criado inicialmente para uma competição, com o desafio de desenvolver uma aplicação completa que unisse **design, funcionalidade e propósito social**.  
A ideia central é permitir que os usuários possam:

- 🔹 **Oferecer serviços** (como colaboradores);  
- 🔹 **Solicitar serviços** (como clientes);  
- 🔹 **Gerenciar e analisar dados** (como empresas — funcionalidade em desenvolvimento).

---

## 👥 Tipos de Usuário

O sistema é dividido em três categorias de usuários:

| Tipo | Descrição |
|------|------------|
| **Cliente** | Pode solicitar serviços de outros usuários. |
| **Colaborador** | Pode oferecer seus serviços e criar seu perfil profissional. |
| **Empresa** | Pode visualizar relatórios e análises de colaboradores (função em desenvolvimento). |

Atualmente, os cadastros de **cliente** e **colaborador** estão ativos e funcionais.  
O cadastro de **empresa** já possui formulário, mas ainda está em desenvolvimento.

---

## ⚙️ Funcionalidades

✅ Cadastro e login com validação via JWT  
✅ Autenticação e controle de sessão  
✅ Interface moderna e responsiva  
✅ Animações com GSAP  
✅ Integração entre front-end e back-end  
⚙️ Dashboard e sistema de empresas (em desenvolvimento)  

---

## 🧠 Tecnologias Utilizadas

### **Front-End**
- [Next.js](https://nextjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [GSAP](https://greensock.com/gsap/)

### **Back-End**
- [Node.js](https://nodejs.org/)
- [Express](https://expressjs.com/)
- [JWT](https://jwt.io/)
- [MongoDB](https://www.mongodb.com/)

---

## 🧩 Estrutura do Projeto

skillhub/
├── client/ # Aplicação Next.js (interface)
│ └── src/
│   ├── app/
│   │ ├── page.tsx
│   ├── assets/
│   ├── components/
│   ├── schemas/
│   ├── providers/
│   ├── lib/
│   ├── hooks/
│   ├── stores/
│   ├── services/
│   └── utils/
│ 
│
├── server/ # Servidor Node.js com Express
│ ├── src/
│ │ ├── api/
│ │ ├── configs/
│ │ ├── modules/
│ │ └── utils/
│ └── index.ts
│
└── README.md

---

## 🖼️ Demonstração

🔗 **Acesse o projeto:** [https://uiskillhub.netlify.app/](https://uiskillhub.netlify.app/)

*(O sistema ainda está em desenvolvimento. Algumas funções podem estar incompletas ou em fase de testes.)*

---

## 🧰 Como Executar Localmente

### 1️⃣ Clonar o repositório:
```bash
git clone https://github.com/JoaoGabriel04/SkillHub
