import { useTranslation } from "react-i18next";

import { Button } from "#components/ui/button";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const language = i18n.resolvedLanguage === "ko" ? "ko" : "en";

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        void i18n.changeLanguage(language === "ko" ? "en" : "ko");
      }}
    >
      {language === "ko" ? "English" : "한국어"}
    </Button>
  );
}