import { useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFarm } from "../../apis/agroforestry";
import { showMutationError } from "../../apis/common";
import { showSuccess } from "../common/notifications";
import { FarmForm } from ".";

export default function FarmNew() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const farmCreation = useMutation({
    mutationFn: createFarm,
    onSuccess: (data) => {
      showSuccess(data.msg);
      queryClient.invalidateQueries({ predicate: (query) => { return query.queryKey[0] === 'farmList' } });
      navigate(`/farms/${data.farmId}`);
    },
    onError: showMutationError
  });

  return (
    <FarmForm 
      mutation={farmCreation}
    />
  )
}
