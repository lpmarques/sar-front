import { useParams } from "react-router-dom";
import { Center } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { getCroppingPattern } from "../../apis/agroforestry";
import { QueryLoader } from "../common/QueryLoader";
import CroppingPatternPreview from "./CroppingPatternPreview";

export default function CroppingPatternPreviewPage() {
  let { patternId } = useParams();
  
  const patternQueryOptions = {
    queryKey: ['croppingPattern', patternId?.toString() ?? '0'],
    queryFn: getCroppingPattern,
    enabled: patternId !== undefined,
  };
  const pattern = useQuery(patternQueryOptions);

  if (!pattern.data)
    return (
      <Center>
        <QueryLoader {...patternQueryOptions} />
      </Center>
    );
  
  return <CroppingPatternPreview pattern={pattern.data} />
}
