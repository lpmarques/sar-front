import { Card, Container, Image, SimpleGrid, Text } from '@mantine/core';
import { Link } from 'react-router';
import classes from './Home.module.css'

const tools = [
  {
    imageSource: "https://upload.wikimedia.org/wikipedia/commons/e/ec/Cariniana_Strelensis-_jequitiba_branco.jpg",
    name: "Catálogo de Plantas",
    description: "No catálogo, você encontra dezenas de plantas que podem ser úteis para o seu sistema agroflorestal."
  },
  {
    imageSource: "https://images.squarespace-cdn.com/content/v1/64d91702b4c77e2b69ddc49e/3a2dab88-20dd-4448-aa08-fcce23798264/urbanfarm2.jpg",
    name: "Projeto Agroflorestal",
    description: "O projeto te ajuda a planejar o sistema agroflorestal perfeito para o seu local."
  }
]

export default function Home() {

  const cards = tools.map((tool) => (
    <Link to="/" className={classes.card} style={{ textDecoration: 'none' }}>
      <Card
        shadow="sm"
        padding="xl"
        key={tool.name}
        className={classes.card}
      >
        <Card.Section>
          <Image
            src={tool.imageSource}
            h={160}
          />
        </Card.Section>

        <Text fw={500} size="lg" mt="md">
          {tool.name}
        </Text>

        <Text mt="xs" c="dimmed" size="sm">
          {tool.description}
        </Text>
      </Card>
    </Link>
  ));

  return (
    <Container py="xl">
      <SimpleGrid cols={{ base: 1, xs: 2 }}>
        {cards}
      </SimpleGrid>
    </Container>
  )
}
