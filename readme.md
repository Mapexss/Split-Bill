# 1. Instalar dependências
bun install

# 2. Gerar o CSS do Tailwind
bunx tailwindcss -i ./src/styles.css -o ./public/styles.css --minify

# 3. Gerar o bundle React
bun build src/client.tsx --outdir=public --sourcemap=external --target=browser --minify

# 4. Ou simplesmente rodar o dev (que serve tudo dinamicamente)
bun dev