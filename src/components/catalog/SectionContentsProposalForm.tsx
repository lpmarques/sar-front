import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, CloseButton, Divider, Paper, Table, Text, Tooltip } from '@mantine/core';
import { FormErrors, isNotEmpty, useField, UseFormReturnType } from '@mantine/form';
import { IconCircleDashedPlus } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { showMutationError } from '../../apis/common';
import { ContentReadData, ContentWriteRequestData } from '../../apis/core';
import classes from '../common/Clickable.module.css';
import { showError, showSuccess } from '../common/notifications';
import { QueryLoader } from '../common/QueryLoader';
import { ContentForm, SectionConfig } from './SectionConfigs';
import { StickyHeaderTable } from '../common/StickyHeaderTable';
import { CommentInput, SourceSelect } from '.';

export default function SectionContentsProposalForm<ReadT extends ContentReadData, WriteT extends ContentWriteRequestData>({
  plantId,
  sectionConfig,
}: {
  plantId: number,
  sectionConfig: SectionConfig<ReadT, WriteT>,
}) {
  type ContentFormData = ContentForm<WriteT>; 

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const contentsQueryOptions = sectionConfig.buildQueryOptions(plantId);

  const contentCreation = useMutation({
    mutationFn: sectionConfig.createMutationFunction,
    onSuccess: (data) => {
      showSuccess(data.msg);
      queryClient.invalidateQueries({ queryKey: contentsQueryOptions.queryKey });
      navigate("..", {relative: "path"});
    },
    onError: showMutationError
  });

  const { data } = useQuery(contentsQueryOptions);

  const acceptedContents = data ? data.filter(item => item.contentStatus === "accepted") : [];
  const proposedContents = data ? data.filter(item => item.contentStatus === "proposed") : [];

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

  const contentForms = forms.filter((_, index) => rowKeys.includes(index));

  const validateContentForms = (forms: UseFormReturnType<ContentFormData>[]) => {

    const errors = forms.reduce((acc: FormErrors[], form) => {
      let validation = form.validate();
      if (validation.hasErrors)
        acc.push(validation.errors);
      
      return acc;
    }, []);

    return errors;
  }

  const validateFormsDiff = (a: ContentFormData, b: ContentFormData, errMsg: string) => {

    const matchErrors = sectionConfig.formUniqueKey.reduce((matchErrors: FormErrors, key) => {
      if (a[key] === b[key])
        matchErrors[key as string] = errMsg;

      return matchErrors;
    }, {});

    return matchErrors;
  }

  const validateContentUniqueness = (forms: UseFormReturnType<ContentFormData>[]) => {

    const errors = forms.reduce((acc: FormErrors[], form, index) => {
      let values = form.getValues();
      let uniqueKey = sectionConfig.formUniqueKey;

      // uniqueness validation among forms
      for (let i=0; i<index; i++) {
        let matchErrors = validateFormsDiff(values, forms[i].getValues(), "Item duplicado");
        if (Object.keys(matchErrors).length === uniqueKey.length) {
          form.setErrors(matchErrors);
          acc.push(matchErrors);
          return acc;
        }
      }

      // uniqueness validation between form and accepted contents
      for (const content of acceptedContents) {
        let matchErrors = sectionConfig.validateFormToReadDataDiff(values, content, "Igual a item aceito");
        if (Object.keys(matchErrors).length === uniqueKey.length) {
          form.setErrors(matchErrors);
          acc.push(matchErrors);
          return acc;
        }
      }

      // uniqueness validation between form and proposed contents
      for (const content of proposedContents) {
        let matchErrors = sectionConfig.validateFormToReadDataDiff(values, content, "Igual a item já proposto");
        if (Object.keys(matchErrors).length === uniqueKey.length) {
          form.setErrors(matchErrors);
          acc.push(matchErrors);
          return acc;
        }
      }
      
      return acc;
    }, []);

    return errors;
  }

  const handleAddBarClick = () => {
    contentForms.forEach((form) => {
      form.setValues(form.getTransformedValues());
    });
    const errors = validateContentForms(contentForms);

    if (errors.length > 0)
      throw showError("Corrija campos inválidos antes de adicionar um novo item.", "Erro");

    setRowKeys([...rowKeys, forms.length ]);
  }

  const handleRemoveButtonClick = (deletedKey: number) => {
    setRowKeys(rowKeys.filter((key) => key !== deletedKey));
  }

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();

    const comment = commentField.getValue().trim();
    contentForms.forEach((form) => {
      form.setValues(form.getTransformedValues());
    });

    const contentErrors = [ ...validateContentForms(contentForms), ...validateContentUniqueness(contentForms) ];
    const sourceError = await sourceField.validate();
    const commentError = await commentField.validate();

    if (contentErrors.length > 0 || sourceError || commentError)
      throw showError("Há campos inválidos no formulário.", "Erro");
    
    contentForms.forEach((form) => {
      let writeData = sectionConfig.buildWriteRequestData({
        formValues: form.getValues(),
        plantId: plantId,
        sourceId: Number(sourceField.getValue()),
        contentProposerComment: comment.length > 0 ? comment : undefined,
      });
      contentCreation.mutate(writeData);
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
        contentsQueryOptions={contentsQueryOptions}
        />
      <Table.Td>
        <CloseButton size="sm" onClick={() => handleRemoveButtonClick(key)} />
      </Table.Td>
    </Table.Tr>
  )), [rowKeys]);

  const footer = (
    <Table.Tr key={-1}>
      <Tooltip withArrow label="Clique para adicionar um novo item a sua proposta." position="bottom">
        <Table.Td colSpan={10} align="center" onClick={() => handleAddBarClick()} className={classes.row}>
          <IconCircleDashedPlus color="var(--mantine-color-dark-3)" size={35}/>
        </Table.Td>
      </Tooltip>
    </Table.Tr>
  );

  const style = { backgroundColor: "#f0f2f2" };
  const divider = <Divider mt={25} mb={15} />;
  const enableSubmit = rows.length > 0;

  return (
    <QueryLoader {...contentsQueryOptions}>
      <Paper withBorder style={style} ta="center" p={15} mb={20}>
        <Text fz="h5" fw={600} pb={10}>Proposta</Text>
        <StickyHeaderTable header={header} rows={[...rows, footer]} scrollWidth={600} scrollHeight={500} headerStyle={style} />
        {divider}
        <Text fz="h5" fw={600} pb={10}>Fonte</Text>
        <SourceSelect field={sourceField} />
        {divider}
        <Text fz="h5" fw={600} pb={10}>Comentário <Text span size="sm" c="dimmed">(opcional)</Text></Text>
        <CommentInput field={commentField} maxChars={commentMaxChars} />
        {divider}
        <Button type="submit" color="teal" disabled={!enableSubmit} onClick={handleSubmit} loading={contentCreation.isPending}>Publicar proposta</Button>
      </Paper>
    </QueryLoader>
  )
}
