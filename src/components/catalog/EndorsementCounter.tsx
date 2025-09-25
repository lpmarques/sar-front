import { Group, GroupProps, Text, TextProps, UnstyledButton } from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconProps, IconThumbUp, IconThumbUpFilled } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryOptions, showMutationError } from "../../apis/common";
import {
  ContentReadData,
  createEndorsement,
  deleteEndorsement,
} from '../../apis/core';
import { showError, showSuccess } from '../common/notifications';
import { useAuth } from "../../hooks/useAuth";
import { EndorsementList } from '.';

interface EndorsementCounterProps<ReadT extends ContentReadData> extends Omit<GroupProps, 'content'> {
  content: ReadT,
  contentQueryOptions: QueryOptions<ReadT[]>,
  textProps?: TextProps,
  iconProps?: IconProps,
};

export default function EndorsementCounter<ReadT extends ContentReadData>({ 
  content,
  contentQueryOptions, 
  textProps,
  iconProps,
  ...groupProps
}: EndorsementCounterProps<ReadT>) {
  
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const endorsementCreation = useMutation({
    mutationFn: createEndorsement,
    onSuccess: (data) => {
      showSuccess(data.msg);
      invalidateQueries();
    },
    onError: showMutationError
  });
  
  const endorsementDeletion = useMutation({
    mutationFn: deleteEndorsement,
    onSuccess: (data) => {
      showSuccess(data.msg);
      invalidateQueries();
    },
    onError: showMutationError
  });

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: contentQueryOptions.queryKey });
  }

  const handleThumbClick = () => {
    if (!user) {
      window.open('/login', '_blank');
      throw showError("É preciso estar logado para executar essa ação.", null);
    }

    if (user.id == content.contentProposer!.id)
      throw showError("Somente outro usuário pode aprovar conteúdo criado por você.", null);

    console.log(content)
    if (content.userEndorsementId)
      endorsementDeletion.mutate(content.userEndorsementId)
    else {
      endorsementCreation.mutate({
        contentId: content.contentId,
      })
    }
  }

  const openEndorsementListModal = () => modals.open({
    title: "Usuários que aprovaram a informação",
    children: <EndorsementList contentId={content.contentId} />
  });
  
  const count = content.endorsementsCount;
  const ThumbIcon = content.isEndorsedByUser ? IconThumbUpFilled : IconThumbUp;

  return (
    <Group justify="center" gap={25} {...groupProps}>
      <UnstyledButton onClick={openEndorsementListModal}>
        <Text fz="h2" {...textProps}>{count}</Text>
      </UnstyledButton>
      <UnstyledButton mt={5} onClick={handleThumbClick}>
        <ThumbIcon size={25} {...iconProps} />
      </UnstyledButton>
    </Group>
  )
}
