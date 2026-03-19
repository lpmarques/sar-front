/*
Simulador Agroflorestal Regenera (SAR)
Copyright (C) 2026  Lucas Marques and Regenera Mata Atlântica

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses>.
*/

import { Card, Container, Image, SimpleGrid, Text, Title } from '@mantine/core';
import { Link } from 'react-router';
import classes from './Home.module.css';
import safUfrrj from '/rural.jpg';

const tools = [
  {
    imageSource: "https://upload.wikimedia.org/wikipedia/commons/e/ec/Cariniana_Strelensis-_jequitiba_branco.jpg",
    name: "Catálogo de Plantas",
    description: "No catálogo, você encontra diversas plantas que podem ser úteis para o seu sistema agroflorestal.",
    path: "plants",
  },
  {
    imageSource: safUfrrj,
    name: "Projeto Agroflorestal",
    description: "O projeto te ajuda a planejar o sistema agroflorestal ideal para o seu local.",
    path: "farms",
  }
]

export default function Home() {

  const cards = tools.map((tool) => (
    <Link to={tool.path} className={classes.card} style={{ textDecoration: 'none' }}>
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
      <Title fz={36} fw={500} ta="center" mb={50}>Simulador Agroflorestal Regenera</Title>
      <SimpleGrid cols={{ base: 1, xs: 2 }}>
        {cards}
      </SimpleGrid>
    </Container>
  )
}
