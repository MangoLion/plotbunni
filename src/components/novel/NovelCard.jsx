import React from 'react';
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Edit3 } from 'lucide-react';

/**
 * NovelCard Component
 * Displays a novel's cover image (or gradient), name, and action icons.
 * Clicking the card opens the novel.
 *
 * @param {object} props
 * @param {object} props.novel - The novel object { id, name, coverImage? }.
 * @param {function} props.onOpenNovel - Callback function when card is clicked, passed novelId.
 * @param {function} props.onDeleteNovel - Callback function for delete icon, passed novelId.
 * @param {function} props.onEditNovel - Callback function for edit icon, passed novelId.
 */
const NovelCard = ({ novel, onOpenNovel, onDeleteNovel, onEditNovel }) => {
  const { id, name, coverImage } = novel;

  const handleCardClick = () => {
    onOpenNovel(id);
  };

  const handleEditClick = (e) => {
    e.stopPropagation(); // Prevent card click event
    onEditNovel(id);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation(); // Prevent card click event
    onDeleteNovel(id);
  };

  return (
    <Card className="w-full max-w-xs flex flex-col overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 group">
      <div 
        className="aspect-[2/3] w-full relative overflow-hidden cursor-pointer"
        onClick={handleCardClick}
      >
        {coverImage ? (
          <img 
            src={coverImage} 
            alt={`${name} cover`} 
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-500 via-slate-600 to-slate-700 flex items-center justify-center">
            {/* Optional: Could add a subtle text or icon here for "No Cover" if desired */}
          </div>
        )}
        {/* Icon buttons positioned over the image */}
        <div className="absolute top-2 right-2 z-10 flex space-x-1.5 bg-black/20 p-1 rounded-md backdrop-blur-sm opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
          <Button variant="ghost" size="icon" onClick={handleEditClick} title="Rename Novel" className="h-7 w-7 text-white hover:bg-white/20 hover:text-white">
            <Edit3 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleDeleteClick} title="Delete Novel" className="h-7 w-7 text-white hover:bg-red-500/50 hover:text-white">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        {/* Novel Name Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/60 backdrop-blur-md p-2 px-3 shadow-lg w-full">
            <h2 
              className="text-white text-sm md:text-base lg:text-lg font-semibold text-center text-wrap" /* Adjusted text sizes for responsiveness */
              title={name}
            >
              {name || 'Untitled Novel'}
            </h2>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default NovelCard;
