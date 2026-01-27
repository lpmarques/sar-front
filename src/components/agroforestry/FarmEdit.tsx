import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getFarm, updateFarm } from "../../apis/agroforestry";
import { showMutationError } from "../../apis/common";
import { showSuccess } from "../common/notifications";
import { FarmForm } from ".";
import { QueryLoader } from "../common/QueryLoader";

export default function FarmEdit() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { farmId } = useParams();

  const farmQueryOptions = {
    queryKey: ['farm', farmId!],
    queryFn: getFarm
  };
  const farm = useQuery(farmQueryOptions);

  const farmUpdate = useMutation({
    mutationFn: updateFarm,
    onSuccess: (data, variables) => {
      showSuccess(data.msg);
      queryClient.refetchQueries(farmQueryOptions);
      navigate(`/farms/${variables.id}`);
    },
    onError: showMutationError
  });

  return (
    <QueryLoader {...farmQueryOptions}>
      {farm.data &&
      <FarmForm
        farm={farm.data}
        mutation={farmUpdate}
      />}
    </QueryLoader>
  )
}
