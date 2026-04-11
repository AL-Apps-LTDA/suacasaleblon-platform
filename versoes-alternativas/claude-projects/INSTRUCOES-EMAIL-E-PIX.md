# Instruções para Diego — Email Routing + PIX

## 1. Configurar Emails no Cloudflare (5 min)

Você precisa criar 3 endereços de email que encaminham tudo para ditavares@gmail.com.

### Passo a passo:

1. Acesse: **https://dash.cloudflare.com** → faça login
2. Clique no domínio **suacasaleblon.com**
3. No menu lateral, clique em **Email** → **Email Routing**
4. Se for a primeira vez, clique em **Add records and enable** (vai adicionar registros MX automaticamente)
5. Vá em **Routing rules** → **Create address**

#### Criar 3 endereços:

| Custom address | Destination |
|---|---|
| `contato` | ditavares@gmail.com |
| `reservas` | ditavares@gmail.com |
| `diego` | ditavares@gmail.com |

6. Para cada um: digite o nome (ex: `contato`), escolha **Send to an email**, coloque `ditavares@gmail.com` como destino → **Save**
7. Na primeira vez, o Cloudflare vai pedir para verificar o email de destino — cheque seu Gmail e clique no link de verificação
8. Depois de verificado, os 3 endereços ficam ativos imediatamente

### Testar:
Mande um email de outro endereço (não do próprio Gmail) para contato@suacasaleblon.com e veja se chega no seu Gmail.

---

## 2. Ativar PIX no Stripe

### Situação atual:
O PIX no Stripe é **somente por convite** para contas brasileiras. Isso significa que o Stripe precisa liberar o recurso para sua conta antes de você poder ativá-lo.

### O que fazer:

**Opção A — Verificar se já está disponível:**
1. Acesse: **https://dashboard.stripe.com/settings/payment_methods**
2. Procure por "Pix" na lista de métodos de pagamento
3. Se aparecer, clique para ativar
4. Se NÃO aparecer, siga a Opção B

**Opção B — Solicitar acesso ao PIX:**
1. Acesse: **https://support.stripe.com**
2. Abra um chamado/chat com o suporte do Stripe
3. Peça: *"Gostaria de ativar o método de pagamento PIX na minha conta. Minha conta é brasileira (AL Temporada) e preciso do PIX para receber pagamentos de hóspedes."*
4. Eles podem pedir documentos adicionais da empresa

**Opção C — Enquanto espera:**
O botão "Pagar com PIX" no site já está redirecionando para o WhatsApp automaticamente. Quando o PIX for liberado no Stripe, eu ativo no código em poucos minutos.

### Restrições do PIX no Stripe:
- Não disponível para: cripto, seguros, telemedicina, ONGs
- Moeda: somente BRL
- Tempo de expiração do QR code: 30 minutos (já configurado no código)
- O webhook para confirmar pagamento PIX já está configurado e pronto

---

## Resumo do que foi feito hoje (23/03/2026):

- ✅ Checkout com cartão FUNCIONANDO
- ✅ Webhook Stripe configurado (4 eventos, incluindo PIX async)
- ✅ Botão PIX → WhatsApp (temporário)
- ✅ Texto alterado: "Pague menos que no Airbnb e Booking" (3 locais)
- ✅ Deploy v4.2.2 no ar
- ⏳ Emails Cloudflare — instruções acima (precisa de você)
- ⏳ PIX Stripe — instruções acima (precisa de você)
