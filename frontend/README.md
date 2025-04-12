# PromoBot - Frontend

Este é o serviço frontend do sistema PromoBot, responsável pela interface de usuário.

## Deploy no EasyPanel

1. **Criar um novo serviço no EasyPanel**
   - Escolha a opção "GitHub" ou "Upload".
   - Se usar GitHub, selecione o diretório `/frontend` como diretório de contexto.

2. **Configurar variáveis de ambiente**
   ```
   REACT_APP_API_URL=/api
   REACT_APP_SOCKET_URL=/
   REACT_APP_VERSION=1.0.0
   ```

3. **Configurar redirecionamento**
   - No menu "Domínios", configure um redirecionamento:
   - Caminho: `/`
   - Destino: `http://nome-do-servico-frontend:80`
   - Ative o suporte a WebSocket.

## Detalhes do projeto

Este serviço frontend foi desenvolvido utilizando:
- React para construção da interface
- Material UI para componentes visuais
- Axios para requisições HTTP
- Recharts para gráficos e visualizações de dados

## Desenvolvimento local

```bash
# Instalar dependências
npm install

# Executar em modo desenvolvimento
npm start

# Construir para produção
npm run build
```

## Integração com o Backend

O frontend se comunica com o backend através de requisições HTTP para o endpoint `/api`. No ambiente de desenvolvimento, isso é gerenciado pela variável `REACT_APP_API_URL` no arquivo `.env`. Em produção, o EasyPanel gerencia o roteamento para o backend através da configuração de domínio.

# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
