import { Container, Text, Title } from "@mantine/core";
import ClickableText from "./common/ClickableText";

export default function About() {
  return (
    <Container>
      <Title pb={20}>Plataforma SAR</Title>
      <Text pb={25}>
        Mais da metade das pastagens e terras agricultáveis do Brasil apresentam algum nível de degradação.
        Dessas áreas, pelo menos 28 milhões de hectares apresentam alto potencial de uso em cultivos agrícolas.
        Sistemas produtivos biodiversos, como os sistemas agroflorestais (SAFs), podem ajudar na regeneração 
        dessas áreas, recuperando solo e recursos hídricos, e produzindo alimentos ao mesmo tempo. 
      </Text>
      <Text pb={25}>
        A legislação ambiental brasileira incentiva o uso dos SAFs para recompor a flora nativa em áreas degradadas, 
        permitindo ao pequeno produtor e agricultor familiar produzir e regularizar sua propriedade ao mesmo tempo. 
        Contudo, há poucas ferramentas que auxiliem o produtor no planejamento desses sistemas com dados da nossa 
        flora nativa.
      </Text>
      <Text pb={25}>
        A plataforma <strong>Simulador Agroflorestal Regenera (SAR)</strong> surge para mudar essa realidade. 
        Com suas ferramentas Catálogo de Plantas e Projeto Agroflorestal, a plataforma reúne dados da diversidade 
        de plantas agrícolas e nativas da Mata Atlântica e ajuda o usuário a planejar SAFs com as plantas mais 
        adequadas às condições do seu local.
      </Text>
      <Text pb={25}>
        O SAR é resultado da dissertação do biólogo e engenheiro de dados Lucas Marques, no mestrado em Agricultura 
        Orgânica da Universidade Federal Rural do Rio de Janeiro (PPGAO/UFRRJ), em parceria com o projeto de extensão 
        Regenera Mata Atlântica e com a empresa Vertente Sul Engenharia Top. e Soluções Ambientais, tendo seu 
        desenvolvimento fomentado pela Fundação de Amparo à Pesquisa do Estado do Rio de Janeiro (FAPERJ).
      </Text>
      <ClickableText span={false} fz="h3" fw="bold" pb={20} path="/plants">
        Catálogo de Plantas
      </ClickableText>
      <Text pb={25}>
        Reunindo, em uma só base, plantas nativas da Mata Atlântica e exóticas de relevância agrícola, o Catálogo 
        de Plantas preconiza a difusão de <strong>espécies úteis para a restauração produtiva</strong> da paisagem rural
        em nosso bioma. Para isso, ela facilita a busca – por nomes populares e científicos – e detalha características 
        de cada uma das plantas em diversos temas, como hábito, preferências ambientais (clima e solo) e distribuição 
        geográfica.
        Sobretudo, o Catálogo não se limita a um compilado fixo de dados: trata-se de uma ferramenta dinâmica e
        <strong> colaborativa</strong>, onde os usuários podem cadastrar novas plantas e informações referenciadas, 
        ajudando a enriquecer a base sem abrir mão da sua confiabilidade.
      </Text>
      <ClickableText span={false} fz="h3" fw="bold" pb={20} path="/farms">
        Projeto Agroflorestal
      </ClickableText>
      <Text pb={25}>
        Alimentado pelos dados do Catálogo de Plantas e da nossa base unificada de dados públicos geoespaciais 
        (IBGE, INMET, ANA, etc), o Projeto Agroflorestal ajuda o usuário trazer o imóvel rural para um ambiente digital 
        e a projetar SAFs com as plantas mais bem adaptadas ao contexto desse imóvel (solo, clima, restrições de uso e 
        propósito do produtor).
      </Text>
      <Text pb={25}>
        O Projeto Agroflorestal é composto por duas principais interfaces: 1) o <strong>cadastro de propriedades</strong>, 
        onde o usuário delimita o imóvel em um mapa e obtém informações sobre o território, o clima e o solo automaticamente, 
        podendo refiná-las; e 2) o <strong>mapa do projeto</strong>, no qual o usuário delimita áreas de cultivo do seu 
        interesse dentro do imóvel e, para cada área, configura padrões de cultivo agroflorestais, com espécies recomendadas 
        especificamente para o local. Como resultado, a ferramenta gera automaticamente o <strong>croqui do SAF</strong>, 
        valida a adequação do sistema às regras do órgão ambiental (em breve) e gera um relatório de apoio ao pedido de 
        autorização e implantação do cultivo agroflorestal (em breve).
      </Text>
      <Title pt={25} pb={30}>Regenera Mata Atlântica</Title>
      <Text pb={25}>
        Criado em 2023 por docentes do Instituto de Agronomia da UFRRJ, o Regenera Mata Atlântica promove a restauração 
        produtiva e a agroecologia aliando conservação ambiental e geração de renda para a agricultura familiar. O projeto 
        auxilia pequenos produtores na adequação ao Código Florestal e adesão ao Programa de Recuperação Ambiental, por meio 
        da implantação de Sistemas Agroflorestais (SAFs), especialmente em áreas protegidas em estado de degradação,
        na Região Serrana do estado do Rio de Janeiro.
      </Text>
      <Text pb={25}>
        Para facilitar o planejamento sistemático de SAFs, o Regenera desenvolveu metodologias e ferramentas que auxiliam 
        na escolha de espécies nativas e no arranjo dos cultivos de acordo com os critérios da legislação ambiental.
        Essa bagagem metodológica e, em especial, a lista de plantas nativas da Mata Atlântica catalogadas pelo projeto 
        servem como alicerce fundamental para o SAR, conectando o conhecimento científico gerado na universidade às 
        necessidades práticas de extensionistas e produtores rurais.
      </Text>
    </Container>
  )
}
