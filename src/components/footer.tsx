"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

export default function Footer() {
  const t = useTranslations("HomePage");
  const year = new Date().getFullYear();
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0";

  return (
    <motion.footer
      className="py-4 text-center text-sm text-gray-500"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      © {year} @mintbooths. {t("all_rights_reserved")}
      <br />
      <span className="text-xs">
        {t("version")}: {version}
      </span>
    </motion.footer>
  );
}
