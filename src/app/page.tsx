import Image from "next/image";
import Link from "next/link"; // Importa o componente Link para navegação

export default function Home() {
  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <main className="flex flex-col gap-[32px] row-start-2 items-center text-center">
        {/* Se tiveres um logo para o Harper System, podes substituir o src aqui */}
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-6xl font-extrabold tracking-tight sm:text-7xl">
            Harper System
          </h1>
          <p className="mt-4 text-xl text-gray-600 dark:text-gray-400 max-w-lg">
            A solução completa para a gestão dos seus projetos e equipas.
            Organize, colabore e alcance os seus objetivos com facilidade.
          </p>
        </div>

        {/* Botão de Login que redireciona para a rota /login */}
        <Link href="/login" passHref>
          <span className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-gray-900 text-white gap-2 hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300 font-medium text-lg sm:text-xl h-14 px-8 sm:px-10 w-full sm:w-auto cursor-pointer">
            Acessar o Sistema
          </span>
        </Link>
      </main>

      {/* Rodapé opcional, podes adicionar links ou informações aqui */}
      <footer className="row-start-3 text-sm text-gray-500 dark:text-gray-400">
        © {new Date().getFullYear()} Harper System. Todos os direitos reservados.
      </footer>
    </div>
  );
}