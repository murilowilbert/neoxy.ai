# 💰 Arquitetura de Custo Mínimo / Gratuito (AWS e Nuvem)

Um dos pilares do Neoxy.ai é manter a operação o mais barata possível durante o desenvolvimento e os testes iniciais, escalando apenas conforme novos clientes entrarem.

## 1. Fase de Desenvolvimento e Testes (Custo: $0.00 / Mês)
- **Local Machine / Docker Compose**:
  - `neoxy-api` + `redis` + `evolution-api` rodando localmente sem qualquer fatura de nuvem.
  - Banco de dados em SQLite (`neoxy.db`), eliminando a necessidade de instâncias de RDS.
- **IA**: O Google Gemini 2.5 Flash possui cotas gratuitas generosas (RPM) para prototipagem via Google AI Studio.

## 2. Fase de Produção Inicial (Custo: ~$10 a $25 / Mês)
- **Servidor**: AWS Lightsail ou EC2 `t4g.small` (processador ARM Graviton).
  - Mais barato e eficiente energeticamente que instâncias Intel/AMD x86.
- **Banco de Dados**: Supabase (camada gratuita com até 500MB de PostgreSQL) ou RDS PostgreSQL `db.t4g.micro`.
- **Armazenamento de Imagens**: Cloudflare R2 (com taxa zero de tráfego de saída) ou AWS S3.
- **WhatsApp Gateway**: A Evolution API roda na mesma máquina via Docker, consumindo menos de 500MB de RAM.
