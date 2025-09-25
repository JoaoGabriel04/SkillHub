import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";

type Props = {
  title: string;
  icon: IconDefinition;
  url: string;
};

export default function OptionLink({ title, icon, url }: Props) {
  return (
    <li className="w-full">
      <Link href={url} className="w-full flex justify-between">
        <div className="flex justify-center items-center gap-2">
          <FontAwesomeIcon icon={icon} className="text-xl text-zinc-200/80"/>
          <h1 className="text-lg text-zinc-200/80">{title}</h1>
        </div>
        <div>
          <FontAwesomeIcon icon={faChevronRight} className="text-zinc-200/80"/>
        </div>
      </Link>
    </li>
  );
}
