import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from "@/components/ui/card";
import { PlusCircle } from 'lucide-react';

/**
 * AddNewNovelCard Component
 * A card that acts as a button to trigger the creation of a new novel.
 *
 * @param {object} props
 * @param {function} props.onClick - Callback function when the card is clicked.
 */
const AddNewNovelCard = ({ onClick }) => {
  const { t } = useTranslation();
  return (
    <Card 
      className="w-full max-w-xs flex flex-col items-center justify-center overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 cursor-pointer group bg-muted/30 hover:bg-muted/50 aspect-[2/3]"
      onClick={onClick}
      title={t('add_new_novel_card_title')}
    >
      <PlusCircle className="h-16 w-16 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
      <p className="mt-2 text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors duration-300">
        {t('add_new_novel_card_text')}
      </p>
    </Card>
  );
};

export default AddNewNovelCard;
