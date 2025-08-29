import unidecode from 'unidecode-plus';
import { Button, NumberInput, Paper, Select, TagsInput, TextInput } from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { isValidHttpUrl, showMutationError } from "../../apis/common";
import { createSource, getSourceList, SourceWriteRequestData } from "../../apis/core";
import { showError, showSuccess } from '../common/notifications';

export default function SourceForm({ onSubmit }: { onSubmit: Function }) {
  const sourcesQuery = useQuery({
    queryKey: ['sourceList'],
    queryFn: getSourceList
  })

  const sourceTypes = sourcesQuery.data ? [...new Set(sourcesQuery.data.map(source => source.type))] : [];
  const staticSourceTypes = ["book", "chapter", "monography", "paper"]; // TODO: create source_types table with is_static and name_text_id fields
  const currentYear = new Date().getFullYear();

  const sourceCreation = useMutation({
    mutationFn: createSource,
    onSuccess: (data) => {
      showSuccess(data.msg);
      onSubmit(data.sourceId);
    },
    onError: showMutationError
  });

  const form = useForm<SourceWriteRequestData>({
    mode: 'controlled',
    initialValues: {
      type: '',
      title: '',
      year: currentYear,
      authors: undefined,
      publisher: undefined,
      url: undefined,
      description: undefined,
    },
    validate: {
      type: isNotEmpty('Campo obrigatório'),
      title: isNotEmpty('Campo obrigatório'),
      year: isNotEmpty('Campo obrigatório'),
      authors: (value) => {
        if (value && value.some(author => !/^(([A-Z][a-z]+ ?(d[eao][sl]? )?){2,})|((d[eao][sl]? )?[A-Z][a-z]+,? ([A-Z]\. ?)+)$/.test(unidecode(author.trim()))))
          return 'Formatos aceitos: "Nome Sobrenome" ou "Sobrenome N."';
        return null;
      },
      url: (value) => {
        if (value && !isValidHttpUrl(value.trim()))
          return 'URL inválida';
        return null;
      }
    }
    // TODO: use transform to trim values before posting
  });

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();

    const validation = form.validate();
    if (validation.hasErrors)
      throw showError("Há campos inválidos no formulário.", "Erro");
    
    sourceCreation.mutate(form.values);
  }

  const inputs = (
    <>
      <Select
        key={form.key('type')}
        label="Tipo de fonte"
        data={sourceTypes}
        required
        {...form.getInputProps('type')}
      />
      {form.getValues().type && 
      <>
      <TextInput
        key={form.key('title')}
        label="Título"
        required
        {...form.getInputProps('title')}
      />
      <NumberInput
        key={form.key('year')}
        label={staticSourceTypes.includes(form.getValues().type) ? "Ano de publicação" : "Ano de consulta"}
        min={0}
        max={currentYear}
        required
        {...form.getInputProps('year')}
      />
      <TagsInput
        key={form.key('authors')}
        label="Autores(as)"
        placeholder="Nome + Enter, para adicionar"
        {...form.getInputProps('authors')}
      />
      <TextInput
        key={form.key('publisher')}
        label="Publicado por:"
        placeholder="Nome da editora, revista científica ou responsável, etc."
        title="Nome da editora, revista científica ou responsável, etc."
        {...form.getInputProps('publisher')}
      />
      <TextInput
        key={form.key('url')}
        label="URL"
        placeholder="https://www.exemplo.com.br"
        {...form.getInputProps('url')}
      />
      <TextInput
        key={form.key('description')}
        label="Descrição"
        placeholder="Explique sobre o que a fonte trata."
        title="Explique sobre o que a fonte trata."
        {...form.getInputProps('description')}
      />
      </>}
    </>
  );
  
  return (
    <>
    {/* <Paper withBorder shadow="sm" p={22} mt={30} mb={30} radius="md"> */}
      {inputs}
      <Button loading={sourceCreation.isPending} mt={20} type="submit" onClick={handleSubmit}>Cadastrar fonte</Button>
    {/* </Paper> */}
    </>
  )
}
