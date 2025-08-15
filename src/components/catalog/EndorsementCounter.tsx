import { useEffect, useState } from 'react';
import { Group, Text, TextProps, UnstyledButton } from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconThumbUp, IconThumbUpFilled } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { showSuccess } from '../common/notifications';
import { showMutationError } from "../../apis/common";
import {
  createEndorsement,
  deleteEndorsement,
  getEndorsements,
  getUserEndorsements
} from '../../apis/core';
import { useAuth } from "../../hooks/useAuth";
import { EndorsementList } from '../user';
import { QueryLoader } from '../common/QueryLoader';

type EndorsementCounterProps = {
  contentType: string,
  contentId: number,
  initialCount?: {
    value: number,
    queryKey: string[]
  },
  countTextProps?: TextProps
};

export default function EndorsementCounter({ contentType, contentId, initialCount, countTextProps }: EndorsementCounterProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [count, setCount] = useState(initialCount?.value || 0);
  const [userEndorsementId, setUserEndorsementId] = useState(0);
  const [endorsed, setEndorsed] = useState(false);
  const ThumbIcon = endorsed ? IconThumbUpFilled : IconThumbUp;
  console.log('render') // TODO: fix excessive rendering repetition

  const endorsementsQueryOptions = {
    queryKey: ['endorsements', contentType, contentId.toString()],
    queryFn: getEndorsements,
  };

  const userEndorsementsQueryOptions = {
    queryKey: ['userEndorsements', contentType, contentId.toString()],
    queryFn: getUserEndorsements,
    refetchOnMount: true,
  };
  
  // useEffect foi necessário para atualizar infos sem repetir requests ao backend
  if (initialCount === undefined) {
    const endorsements = useQuery(endorsementsQueryOptions);
    useEffect(() => {
      if (endorsements.data) {
        setCount(endorsements.data.length);
      }
    }, [endorsements.data]);
  }

  const userEndorsements = useQuery(userEndorsementsQueryOptions);
  useEffect(() => {
    if (userEndorsements.data && userEndorsements.data.length > 0) {
      setEndorsed(true);
      setUserEndorsementId(userEndorsements.data[0].id);
    }
  }, [userEndorsements.data]);
  
  const endorsementCreation = useMutation({
    mutationFn: createEndorsement,
    onSuccess: (data) => {
      setCount(count+1);
      setEndorsed(true);
      setUserEndorsementId(data.endorsementId);
      showSuccess(JSON.stringify(data.msg));
      invalidateQueries();
    },
    onError: showMutationError
  });
  
  const endorsementDeletion = useMutation({
    mutationFn: deleteEndorsement,
    onSuccess: (data) => {
      setCount(count-1);
      setEndorsed(false);
      setUserEndorsementId(0);
      showSuccess(JSON.stringify(data.msg));
      invalidateQueries();
    },
    onError: showMutationError
  });

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: endorsementsQueryOptions.queryKey });
    queryClient.invalidateQueries({ queryKey: userEndorsementsQueryOptions.queryKey });
    if (initialCount !== undefined)
      queryClient.invalidateQueries({ queryKey: initialCount.queryKey });
  }

  const handleThumbClick = () => {
    if (!user) {
      window.open('/user/login', '_blank');
      return;
    }

    if (endorsed)
      endorsementDeletion.mutate(userEndorsementId)
    else {
      endorsementCreation.mutate({
        endorserId: user.id,
        contentType: contentType,
        contentId: contentId,
      })
    }
  }

  const openEndorsementListModal = (contentType: string, contentId: number) => modals.open({
    title: "Usuários que aprovaram a versão",
    children: <EndorsementList contentType={contentType} contentId={contentId} />
  });

  return (
    <QueryLoader {...userEndorsementsQueryOptions}>
      <Group justify="center" gap={25}>
        <UnstyledButton onClick={() => openEndorsementListModal(contentType, contentId)}>
          <Text {...countTextProps}>{count}</Text>
        </UnstyledButton>
        <UnstyledButton mt={5} onClick={handleThumbClick}>
          <ThumbIcon />
        </UnstyledButton>
      </Group>
    </QueryLoader>
  )
}
