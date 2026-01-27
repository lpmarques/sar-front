import { Fieldset, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { getSiteTraitList, SiteReadData } from "../../apis/agroforestry";
import FieldView from "../common/FieldView";
import { QueryLoader } from "../common/QueryLoader";

const absentInfo = <Text span c="red">Não informado</Text>;

export default function SiteTraitsDetails({ site }: { site: SiteReadData }) {
  
  const siteTraitsQueryOptions = {
    queryKey: [ 'siteTraitList' ],
    queryFn: getSiteTraitList
  };
  const siteTraits = useQuery(siteTraitsQueryOptions);

  const traitValues = Object.fromEntries(site.traitValues.map(traitValue => [traitValue.traitSlug, traitValue]));
  
  const sections = siteTraits.data ? Object.fromEntries(
    siteTraits.data.map(trait => [trait.sectionSlug, trait.sectionName])
  ) : {};

  const otherSectionSlugs = Object.keys(sections).filter(sectionSlug => !["land", "climate", "soil"].includes(sectionSlug));

  const orderedTraits = siteTraits.data ? siteTraits.data.sort((a, b) => a.position-b.position) : [];
  // TODO: consider moving this logic into apis/agroforestry.ts (possible repetition in FarmNew)
  const sectionedTraits = Object.fromEntries(
    Object.keys(sections).map(sectionSlug => [
      sectionSlug, // section slug key
      orderedTraits.filter(trait => trait.sectionSlug === sectionSlug)
    ])
  );
  
  const climateFields = sectionedTraits["climate"] && sectionedTraits["climate"].map(trait => (
    <FieldView pb={10} key={trait.slug} label={trait.name}>
      {traitValues[trait.slug] ? traitValues[trait.slug].value : absentInfo}
    </FieldView>
  ));
  
  const soilFields = sectionedTraits["soil"] && sectionedTraits["soil"].map(trait => (
    <FieldView pb={10} key={trait.slug} label={trait.name}>
      {traitValues[trait.slug] ? traitValues[trait.slug].value : absentInfo}
    </FieldView>
  ));

  const otherFieldsets = otherSectionSlugs.map(sectionSlug => (
    <Fieldset mb={10} key={sectionSlug} legend={sections[sectionSlug]}>
      { sectionedTraits[sectionSlug].map(trait => (
        <FieldView pb={10} key={trait.slug} label={trait.name}>
          {traitValues[trait.slug] ? traitValues[trait.slug].value : absentInfo}
        </FieldView>
      )) }
    </Fieldset>
  ));

  return (
    <QueryLoader {...siteTraitsQueryOptions}>
      <Fieldset mb={10} legend={sections["climate"]}>
        {climateFields}
      </Fieldset>
      <Fieldset mb={10} legend={sections["soil"]}>
        {soilFields}
      </Fieldset>
      {otherFieldsets}
    </QueryLoader>
  )
}