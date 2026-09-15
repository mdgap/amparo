import { Cabecalho } from "../components/Cabecalho.tsx";
import { IconeBalanca, IconeDocumento, IconeTrofeu } from "../components/Icones.tsx";

const EQUIPE = [
  { nome: "Vinícius Brunoni", papel: "Idealizador · Advogado", texto: "Idealização do Amparo, desenvolvimento e conhecimento jurídico.", foto: "/equipe/vinicius-brunoni.jpeg", linkedin: "https://www.linkedin.com/in/vinicius-b-514541287/", github: "https://github.com/brunonivinicius" },
  { nome: "Geraldo Baranoski", papel: "Advogado · Desenvolvedor", texto: "Conhecimento jurídico e desenvolvimento da aplicação.", foto: "/equipe/geraldo-baranoski.jpeg", linkedin: "https://www.linkedin.com/in/geraldobaranoski", github: "https://github.com/geraldobarar" },
  { nome: "Lucas Messias", papel: "Desenvolvedor", texto: "Desenvolvimento e construção da aplicação.", foto: "/equipe/lucas-messias.jpeg", linkedin: "https://www.linkedin.com/in/lucas-maciel-messias-6a370a141/", github: "https://github.com/lucasmessias9898" },
  { nome: "Paulo Jalowyj", papel: "Tech Lead", texto: "Liderança da equipe, documentação e organização das entregas.", foto: "/equipe/paulo-jalowyj.png", linkedin: "https://www.linkedin.com/in/paulojalowyj", github: "https://github.com/paulojalowyj" },
] as const;

export function Hackathon() {
  return (
    <>
      <Cabecalho
        descricao="A equipe MindTheGap criou o projeto Amparo durante a 6ª edição do Hackathon da Cidadania OAB/PR, em setembro de 2026, e venceu a categoria Inovação Aberta e Cidadania."
        passo="O Hackathon"
        secao={null}
        titulo="Uma ideia premiada, construída em equipe"
      />

      <section className="overflow-hidden rounded-2xl bg-[#073a27] px-6 py-8 text-white sm:px-8 sm:py-10" aria-labelledby="conquista-titulo">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-[#c9ff36] text-[#073a27]">
            <IconeTrofeu className="size-8" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#c9ff36]">1º lugar</p>
            <h2 className="fonte-display mt-2 text-2xl font-bold sm:text-3xl" id="conquista-titulo">Campeões em Inovação Aberta e Cidadania</h2>
            <p className="mt-3 max-w-[47rem] text-sm leading-relaxed text-white/80">A conquista reconheceu a proposta da Amparo: transformar regras complexas sobre o fornecimento judicial de medicamentos em um fluxo claro, verificável e útil para a advocacia.</p>
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-2" aria-label="O evento e o projeto">
        <article className="cartao p-6">
          <span className="icone-secao"><IconeBalanca className="size-5" /></span>
          <h2 className="fonte-display mt-4 text-lg font-bold">O desafio</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">Promovido pela OAB Paraná, o Hackathon da Cidadania reuniu equipes para criar soluções jurídicas abertas, baseadas em inteligência artificial, capazes de enfrentar problemas reais da advocacia e ampliar o acesso à Justiça.</p>
          <p className="mt-3 text-sm leading-relaxed text-muted">A edição ocorreu presencialmente em Curitiba, nos dias 12 e 13 de setembro de 2026, com entregas sucessivas, auditoria técnica e apresentação final para a banca.</p>
        </article>
        <article className="cartao p-6">
          <span className="icone-secao"><IconeDocumento className="size-5" /></span>
          <h2 className="fonte-display mt-4 text-lg font-bold">Nossa resposta</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">A MindTheGap escolheu um ponto delicado do acesso à saúde: preparar ações para solicitar medicamentos não incorporados ao SUS. Em pouco tempo, conectamos experiência jurídica, regras determinísticas, fontes oficiais e uma interface feita para conferência profissional.</p>
          <p className="mt-3 text-sm leading-relaxed text-muted">O resultado foi um protótipo funcional, documentado e publicado como código aberto. Esta demonstração preserva a experiência construída no evento sem executar serviços pagos.</p>
        </article>
      </section>

      <section className="mt-10" aria-labelledby="equipe-titulo">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#356149]">Quem construiu</p>
        <h2 className="fonte-display mt-2 text-2xl font-bold" id="equipe-titulo">Equipe MindTheGap</h2>
        <p className="mt-2 max-w-[52rem] text-sm leading-relaxed text-muted">A equipe do hackathon adotou o nome do <a className="font-semibold text-[#155b3d] underline decoration-[#9fb9aa] underline-offset-4 hover:decoration-current" href="https://mdgap.org/" target="_blank" rel="noreferrer">MindTheGap ↗</a>, grupo de pesquisa em inovação e Direito que atua junto ao UEPG LegalTechLab. Paulo é pesquisador do grupo. A parceria entre pesquisa, desenvolvimento e prática jurídica permitiu transformar o problema em um produto demonstrável dentro do tempo do evento.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {EQUIPE.map((integrante) => (
            <article className="cartao flex items-center gap-4 p-5" key={integrante.nome}>
              <img className="size-20 shrink-0 rounded-full object-cover ring-2 ring-[#dbe6df]" src={integrante.foto} alt={`Foto de ${integrante.nome}`} width="80" height="80" />
              <div className="min-w-0">
                <p className="fonte-display font-bold">{integrante.nome}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#356149]">{integrante.papel}</p>
                <p className="mt-2 text-sm text-muted">{integrante.texto}</p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                  <a className="text-sm font-semibold text-[#155b3d] underline decoration-[#9fb9aa] underline-offset-4 hover:decoration-current" href={integrante.linkedin} target="_blank" rel="noreferrer">LinkedIn ↗</a>
                  <a className="text-sm font-semibold text-[#155b3d] underline decoration-[#9fb9aa] underline-offset-4 hover:decoration-current" href={integrante.github} target="_blank" rel="noreferrer">GitHub ↗</a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
