import { LanguagesIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "#components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "#components/ui/dropdown-menu";

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();

  const currentLanguage = i18n.resolvedLanguage?.startsWith("ko")
    ? "ko"
    : "en";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("language.label")}
        >
          <LanguagesIcon />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          {t("language.label")}
        </DropdownMenuLabel>

        <DropdownMenuRadioGroup
          value={currentLanguage}
          onValueChange={(value) => {
            if (value === "en" || value === "ko") {
              void i18n.changeLanguage(value);
            }
          }}
        >
          <DropdownMenuRadioItem value="ko">
            한국어
          </DropdownMenuRadioItem>

          <DropdownMenuRadioItem value="en">
            English
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}