import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, CloseButton, Divider, Paper, Table, Text, Tooltip } from '@mantine/core';
import { FormErrors, isNotEmpty, useField, UseFormReturnType } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { showMutationError } from '../../apis/common';
import { ContentReadData, ContentWriteRequestData } from '../../apis/core';
import AddRow from '../common/AddRow';
import { showError, showSuccess } from '../common/notifications';
import { QueryLoader } from '../common/QueryLoader';
import { StickyHeaderTable } from '../common/StickyHeaderTable';
import { ContentForm, SectionConfig } from './SectionConfigs';
import { CommentInput, SourceSelect } from '.';

export default function SectionItemsProposalForm<ReadT extends ContentReadData, WriteT extends ContentWriteRequestData>({
  plantId,
  sectionConfig,
}: {
  plantId: number,
  sectionConfig: SectionConfig<ReadT, WriteT>,
}) {
  type ContentFormData = ContentForm<WriteT>;

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const itemsQueryOptions = sectionConfig.buildQueryOptions(plantId);

  const proposalCreation = useMutation({
    mutationFn: sectionConfig.createMutationFunction,
    onSuccess: (data) => {
      showSuccess(data.msg);
      // TODO: implement multi-item posting endpoint so as to avoid redundant query refetching
      queryClient.invalidateQueries({ queryKey: itemsQueryOptions.queryKey });
      navigate("..", {relative: "path"});
    },
    onError: showMutationError
  });

  const { data } = useQuery(itemsQueryOptions);

  const acceptedItems = data ? data.filter(item => item.contentStatus === "accepted") : [];
  const proposedItems = data ? data.filter(item => item.contentStatus === "proposed") : [];

  const sourceField = useField<string | undefined>({
    initialValue: undefined,
    validate: isNotEmpty('Campo obrigatório')
  });

  const commentMaxChars = 300;
  const commentField = useField<string>({
    initialValue: '',
    validateOnChange: true,
    validate: (value) => {
      if (value && value.length > commentMaxChars) return 'Comentário ultrapassa o limite máximo de caracteres';
    }
  });

  const [forms, setForms] = useState<UseFormReturnType<ContentFormData>[]>([]);
  const [rowKeys, setRowKeys] = useState<number[]>([]);

  const itemForms = forms.filter((_, index) => rowKeys.includes(index));

  const validateItemForms = (forms: UseFormReturnType<ContentFormData>[]) => {

    const errors = forms.reduce((acc: FormErrors[], form) => {
      let validation = form.validate();
      if (validation.hasErrors)
        acc.push(validation.errors);
      
      return acc;
    }, []);

    return errors;
  }

  const defaultValidateFormsDiff = (a: ContentFormData, b: ContentFormData, errMsg: string) => {

    const matchErrors = sectionConfig.formKeys.reduce((matchErrors: FormErrors, key) => {
      if (a[key] === b[key])
        matchErrors[key as string] = errMsg;

      return matchErrors;
    }, {});

    if (Object.keys(matchErrors).length === sectionConfig.formKeys.length)
      return matchErrors;
  }

  const validateFormsDiff = sectionConfig.validateFormsDiff ?? defaultValidateFormsDiff;

  const validateContentUniqueness = (forms: UseFormReturnType<ContentFormData>[]) => {

    const errors = forms.reduce((acc: FormErrors[], form, index) => {
      let values = form.getValues();

      // uniqueness validation among forms
      for (let i=0; i<index; i++) {
        let matchErrors = validateFormsDiff(values, forms[i].getValues(), "Item duplicado");
        if (matchErrors) {
          form.setErrors(matchErrors);
          acc.push(matchErrors);
          return acc;
        }
      }

      // uniqueness validation between form and accepted items
      for (const item of acceptedItems) {
        let matchErrors = sectionConfig.validateFormToReadDataDiff(values, item, "Igual a item aceito");
        if (matchErrors) {
          form.setErrors(matchErrors);
          acc.push(matchErrors);
          return acc;
        }
      }

      // uniqueness validation between form and proposed items
      for (const item of proposedItems) {
        let matchErrors = sectionConfig.validateFormToReadDataDiff(values, item, "Igual a item já proposto");
        if (matchErrors) {
          form.setErrors(matchErrors);
          acc.push(matchErrors);
          return acc;
        }
      }
      
      return acc;
    }, []);

    return errors;
  }

  const handleAddRowClick = () => {
    itemForms.forEach((form) => {
      form.setValues(form.getTransformedValues());
    });
    const errors = validateItemForms(itemForms);

    if (errors.length > 0)
      return showError("Corrija campos inválidos antes de adicionar um novo item.", "Erro");

    setRowKeys([...rowKeys, forms.length ]);
  }

  const handleRemoveButtonClick = (deletedKey: number) => {
    setRowKeys(rowKeys.filter((key) => key !== deletedKey));
  }

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();

    const comment = commentField.getValue().trim();
    itemForms.forEach((form) => {
      form.setValues(form.getTransformedValues());
    });

    const itemErrors = [ ...validateItemForms(itemForms), ...validateContentUniqueness(itemForms) ];
    const sourceError = await sourceField.validate();
    const commentError = await commentField.validate();

    if (itemErrors.length > 0 || sourceError || commentError)
      return showError("Há campos inválidos no formulário.", "Erro");
    
    itemForms.forEach((form) => {
      let writeData = sectionConfig.buildWriteRequestData({
        formValues: form.getValues(),
        plantId: plantId,
        sourceId: Number(sourceField.getValue()),
        contentProposerComment: comment.length > 0 ? comment : undefined,
      });
      proposalCreation.mutate(writeData);
    })
  }

  const header = (
    <Table.Tr>
      <sectionConfig.Header />
      <Table.Th w={42}></Table.Th>
    </Table.Tr>
  );
  const rows = useMemo(() => rowKeys.map((key) => (    
    <Table.Tr key={key}>
      <sectionConfig.FormRow
        forms={forms}
        setForms={setForms} // passing setter here is necessary since you can't call the useForm hook conditionally
        itemsQueryOptions={itemsQueryOptions}
      />
      <Table.Td>
        <CloseButton size="sm" onClick={() => handleRemoveButtonClick(key)} />
      </Table.Td>
    </Table.Tr>
  )), [rowKeys]);

  const footer = (
    <Tooltip key={-1} withArrow label="Clique para adicionar um novo item a sua proposta." position="bottom">
      <AddRow
        colSpan={sectionConfig.formKeys.length+1}
        onClick={() => handleAddRowClick()}
        style={{'--hover-color': 'var(--mantine-color-gray-2)'}}
      />
    </Tooltip>
  );

  const style = { backgroundColor: "var(--mantine-color-gray-1)" };
  const divider = <Divider mt={25} mb={15} />;
  const enableSubmit = rows.length > 0;

  return (
    <QueryLoader {...itemsQueryOptions}>
      <Paper withBorder style={style} ta="center" p={15} mb={20}>
        <Text fz="h5" fw={600} pb={10}>Proposta</Text>
        <StickyHeaderTable
          header={header}
          rows={[...rows, footer]}
          scrollWidth={sectionConfig.formKeys.length*125}
          scrollHeight={500}
          headerStyle={style}
        />
        {divider}
        <Text fz="h5" fw={600} pb={10}>Fonte</Text>
        <SourceSelect field={sourceField} />
        {divider}
        <Text fz="h5" fw={600} pb={10}>Comentário <Text span size="sm" c="dimmed">(opcional)</Text></Text>
        <CommentInput field={commentField} maxChars={commentMaxChars} placeholder="Se achar pertinente, fale mais aqui sobre sua proposta." />
        {divider}
        <Button type="submit" color="teal" disabled={!enableSubmit} onClick={handleSubmit} loading={proposalCreation.isPending}>Publicar proposta</Button>
      </Paper>
    </QueryLoader>
  )
}
