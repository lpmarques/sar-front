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

import { useNavigate } from 'react-router';
import { Button, Container, Fieldset, Paper, Space, TextInput, Title } from "@mantine/core";
import { isNotEmpty, useField } from "@mantine/form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { proposePlant, getTaxonList, TaxonReadData } from "../../apis/catalog";
import { showMutationError } from '../../apis/common';
import { showError, showSuccess } from "../common/notifications";
import { QueryLoader } from '../common/QueryLoader';
import { usePopularNameForm } from "./PopularNamesSection";
import { useTaxonForm } from "./TaxonomySection";
import { CommentInput, SourceSelect } from '.';
import { undefinedIfEmpty } from '../../utils/common';

export default function PlantNew() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const taxaQueryOptions = {
    queryKey: ['taxonList', 'status=accepted,proposed'],
    queryFn: getTaxonList
  };

  const taxa = useQuery(taxaQueryOptions);

  const taxonForm = useTaxonForm({
    initialValues: {
      taxonomicStatus: 'accepted'
    }
  });

  const taxonSourceField = useField<string | undefined>({
    initialValue: undefined,
    validate: isNotEmpty('Campo obrigatório')
  });

  const validateTaxonNameUniqueness = (acceptedTaxa: TaxonReadData[]) => {
    const formValues = taxonForm.getValues();
    const errMsg = "Igual a nome ou sinônimo já cadastrado";
    for (const item of acceptedTaxa) {

      const matchErrors = {
        ...(formValues.species === item.species && { species: errMsg }),
        ...(formValues.subspecies === undefinedIfEmpty(item.subspecies) && { subspecies: errMsg }),
        ...(formValues.variety === undefinedIfEmpty(item.variety) && { variety: errMsg }),
        ...(formValues.taxonomicStatus === item.taxonomicStatus && { taxonomicStatus: errMsg }),
      };
      
      if (Object.keys(matchErrors).length === 4) {
        taxonForm.setErrors(matchErrors);
        return matchErrors;
      }
    }
  };

  const taxonFieldset = (
    <Fieldset key="taxonomy" legend="Taxonomia (classificação aceita)" mb={10}>
      <TextInput
        key={taxonForm.key('species')}
        label="Espécie"
        placeholder="Genus species"
        required
        {...taxonForm.getInputProps('species')}
      />
      <TextInput
        key={taxonForm.key('subspecies')}
        label="Subespécie"
        placeholder="subspecies"
        {...taxonForm.getInputProps('subspecies')}
      />
      <TextInput
        key={taxonForm.key('variety')}
        label="Variedade"
        placeholder="varietas"
        {...taxonForm.getInputProps('variety')}
      />
      <TextInput
        key={taxonForm.key('family')}
        label="Família"
        placeholder="Famileae"
        required
        {...taxonForm.getInputProps('family')}
      />
      <SourceSelect
        key="taxonSource"
        field={taxonSourceField}
        label="Fonte"
        groupProps={{align: "end", justify: "left", mb: 0}}
      />
    </Fieldset>
  );

  const popularNameForm = usePopularNameForm();

  const popularNameSourceField = useField<string | undefined>({
    initialValue: undefined,
    validate: isNotEmpty('Campo obrigatório')
  });

  const popularNameFieldset = (
    <Fieldset key="popularName" legend="Nome popular" mb={10}>
      <TextInput
        key={popularNameForm.key('name')}
        label="Nome"
        placeholder="nome-exemplo"
        required
        {...popularNameForm.getInputProps('name')}
      />
      <SourceSelect
        key="popularNameSource"
        field={popularNameSourceField}
        label="Fonte"
        groupProps={{align: "end", justify: "left", mb: 0}}
      />
    </Fieldset>
  );

  const commentMaxChars = 300;
  const commentField = useField<string>({
    initialValue: '',
    validateOnChange: true,
    validate: (value) => {
      if (value && value.length > commentMaxChars) return 'Comentário ultrapassa o limite máximo de caracteres';
    }
  });

  const plantProposal = useMutation({
    mutationFn: proposePlant,
    onSuccess: (data) => {
      showSuccess(data.msg);
      queryClient.invalidateQueries({ predicate: (query) => { return query.queryKey[0] === 'plantList' } });
      queryClient.invalidateQueries({ predicate: (query) => { return query.queryKey[0] === 'taxonList' } });
      navigate(`/plants/${data.plantId}?edit=true`);
    },
    onError: showMutationError
  });

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();
    
    const comment = commentField.getValue().trim();
    taxonForm.setValues(taxonForm.getTransformedValues());
    popularNameForm.setValues(popularNameForm.getTransformedValues());

    const taxonValidation = taxonForm.validate();
    const taxonUniquenessErrors = validateTaxonNameUniqueness(taxa.data!);
    const taxonErrors = taxonValidation.hasErrors ? { ...taxonValidation.errors, ...taxonUniquenessErrors } : taxonUniquenessErrors;
    const taxonSourceError = await taxonSourceField.validate();

    const popularNameValidation = popularNameForm.validate();
    const popularNameErrors = popularNameValidation.hasErrors ? popularNameValidation.errors : undefined;
    const popularNameSourceError = await popularNameSourceField.validate();

    const commentError = await commentField.validate();

    if (taxonErrors ||
      taxonSourceError ||
      popularNameErrors ||
      popularNameSourceError ||
      commentError) {   
        console.log(taxonErrors);
        return showError("Há campos inválidos no formulário.", "Erro");
    }
      
    plantProposal.mutate({
      taxon: {
        ...taxonForm.getValues(),
        sourceId: Number(taxonSourceField.getValue()),
      },
      popularName: {
        ...popularNameForm.getValues(),
        sourceId: Number(popularNameSourceField.getValue()),
      },
      contentProposerComment: comment.length > 0 ? comment : undefined,
    });
  }
  
  return (
    <QueryLoader {...taxaQueryOptions}>
      <Container size={450} mt={20} mb={60}>
        <Title fw={500} ta="center" mb={30}>
          Nova Planta
        </Title>
        <Paper withBorder shadow="sm" p={20}>
          {taxonFieldset}
          {popularNameFieldset}
          <CommentInput
            label="Comentário"
            size="sm"
            field={commentField}
            maxChars={commentMaxChars}
            placeholder="Se achar pertinente, fale mais aqui sobre sua proposta."
          />
          <Button
            fullWidth
            mt="xl"
            radius="md"
            color="teal"
            loading={plantProposal.isPending}
            onClick={handleSubmit}
          >
            Publicar proposta
          </Button>
        </Paper>
      </Container>
      <Space h={5}/>
    </QueryLoader>
  )
}
