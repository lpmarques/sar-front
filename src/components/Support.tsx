import { Anchor, Container, Text, Title } from "@mantine/core";

export default function Support() {
  const supportEmail = "perma.lucas@gmail.com";

  return (
    <Container size="xs">
      <Title pb={20}>Suporte</Title>
      <Text fz="lg" pb={5}>
        Precisando de ajuda?
      </Text>
      <Text fz="md" pb={25}>
        Encaminhe sua dúvida por e-mail para:{' '}
        <Anchor href={`mailto:${supportEmail}`}>
          {supportEmail}
        </Anchor>
      </Text>
    </Container>
  )
}
