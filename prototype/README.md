# Protótipo PWA — onboarding e chat

Protótipo estático e responsivo do fluxo de cadastro do síndico até a primeira conversa com a Cora.

## Executar localmente

Na raiz do projeto:

```powershell
python -m http.server 4173 --directory prototype
```

Depois abra <http://127.0.0.1:4173>.

O service worker só é ativado em `localhost`/`127.0.0.1` ou HTTPS. O upload é apenas demonstrativo: nenhum arquivo é enviado ou persistido.
