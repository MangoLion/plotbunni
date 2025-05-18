import React, { useState } from 'react';
import { useData } from '@/context/DataContext';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input"; // For search bar
import { NotebookText, PlusCircle, Filter, Copy, Trash2 } from 'lucide-react'; // Icons
import ConceptFormModal from './ConceptFormModal';
import CreateConceptModal  from './CreateConceptModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { createConcept } from '@/data/models'; // For duplicating concepts

const ConceptCacheList = () => {
  const { concepts, conceptTemplates, addConcept, deleteConcept } = useData(); // Get novel-specific conceptTemplates and addConcept, add deleteConcept
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false); // This should open CreateConceptModal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [conceptToEdit, setConceptToEdit] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [conceptIdToDelete, setConceptIdToDelete] = useState(null);

  const handleDuplicateConcept = (conceptToDuplicate) => {
    const newName = `${conceptToDuplicate.name} (Copy)`;
    // Create a new concept object, ensuring a new ID and updated timestamps
    const duplicatedConcept = createConcept({
      ...conceptToDuplicate, // Spread existing properties
      name: newName,         // Set new name
      // id, creation_date, last_modified_date will be handled by createConcept
    });
    addConcept(duplicatedConcept);
  };

  const handleDeleteConcept = (conceptId) => {
    setConceptIdToDelete(conceptId);
    setIsConfirmModalOpen(true);
  };

  const executeDeleteConcept = () => {
    if (deleteConcept && conceptIdToDelete) {
      deleteConcept(conceptIdToDelete);
    } else {
      console.warn("deleteConcept function is not available on DataContext or conceptIdToDelete is null");
    }
    setConceptIdToDelete(null); // Reset after deletion attempt
  };

  // TODO: Implement search and filter logic (debounce)
  const [searchTerm, setSearchTerm] = useState('');
  const filteredConcepts = concepts.filter(concept =>
    concept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (concept.tags && concept.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))) ||
    (concept.aliases && concept.aliases.some(alias => alias.toLowerCase().includes(searchTerm.toLowerCase()))) ||
    (concept.description && concept.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Group concepts by template type
  const groupedConcepts = filteredConcepts.reduce((acc, concept) => {
    let templateType = 'Other'; // Default to 'Other'

    // Attempt to find a matching template based on the concept's tags
    // This logic might need refinement if a concept could match multiple templates
    // or if tags aren't a reliable indicator of the "original" template.
    // For now, we'll check if any of the concept's tags match a primary tag of a template.
    if (conceptTemplates && concept.tags && concept.tags.length > 0) {
      const matchingNovelTemplate = conceptTemplates.find(novelTemplate => 
        novelTemplate.templateData && 
        novelTemplate.templateData.tags && 
        novelTemplate.templateData.tags.length > 0 &&
        concept.tags.includes(novelTemplate.templateData.tags[0]) // Check against the first tag of the template
      );
      if (matchingNovelTemplate) {
        templateType = matchingNovelTemplate.name;
      }
    }
    
    if (!acc[templateType]) {
      acc[templateType] = [];
    }
    acc[templateType].push(concept);
    return acc;
  }, {});

  // Sort groups: templates first (alphabetical), then 'Other' last
  const sortedGroupKeys = Object.keys(groupedConcepts).sort((a, b) => {
    if (a === 'Other') return 1;
    if (b === 'Other') return -1;
    return a.localeCompare(b);
  });

  return (
    <>
      <ScrollArea className="h-[calc(100vh-4rem)] p-4"> {/* Root ScrollArea like in PlanView */}
        {/* This div now becomes the direct child of ScrollArea, ScrollArea's p-4 will apply to it */}
        <div> 
          <div className="flex justify-between items-center mb-3 p-2"> 
            <h2 className="text-lg font-semibold text-foreground">Concept Cache</h2>
            <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => console.log("Filter clicked (Not Implemented)")} title="Filter (Not Implemented)">
              <Filter className="h-4 w-4" />
            </Button>
            {/* This button should open CreateConceptModal, not ConceptFormModal directly for creation */}
            <Button variant="ghost" size="icon" onClick={() => setIsCreateModalOpen(true)} title="Create New Concept">
              <PlusCircle className="h-5 w-5" />
            </Button>
          </div>
        </div>
      <div className="px-2 mb-3">
        <Input
          type="text"
          placeholder="Search concepts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>
        {filteredConcepts && filteredConcepts.length > 0 ? (
          sortedGroupKeys.map(groupKey => (
            <div key={groupKey}>
              {/* Divider */}
              <div className="px-2 py-1 mt-3 mb-1 text-xs font-semibold text-muted-foreground border-b border-border">
                {groupKey}
              </div>
              {/* Concepts in group */}
              {groupedConcepts[groupKey].map(concept => (
                <div
                  key={concept.id}
                  className="p-2 mb-1 mx-1 border-b border-border hover:bg-muted rounded-md flex items-center text-sm text-foreground group"
                >
                  <div 
                    className="flex-grow flex items-center cursor-pointer"
                    onClick={() => {
                      setConceptToEdit(concept);
                      setIsEditModalOpen(true);
                    }}
                  >
                    {concept.image ? (
                      <img src={concept.image} alt={concept.name} className="w-7 h-7 mr-2 object-cover rounded-sm" />
                    ) : (
                      <NotebookText className="w-7 h-7 mr-2 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className="truncate">{concept.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto h-7 w-7 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent triggering the edit modal
                      handleDuplicateConcept(concept);
                    }}
                    title={`Duplicate "${concept.name}"`}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-1 h-7 w-7 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-primary hover:text-primary-foreground hover:bg-destructive/90"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent triggering the edit modal
                      handleDeleteConcept(concept.id);
                    }}
                    title={`Delete "${concept.name}"`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ))
        ) : (
          <p className="p-2 text-sm text-muted-foreground">No concepts found. Click '+' to add one.</p>
        )}
        </div>
      </ScrollArea>
      
      {/* Modals remain outside the ScrollArea but within the fragment */}
      <CreateConceptModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        {/* The trigger is handled by the PlusCircle button above, so no children needed here if not using DialogTrigger */}
      </CreateConceptModal>

      {/* Edit Modal (uses ConceptFormModal) */}
      {conceptToEdit && (
        <ConceptFormModal
          open={isEditModalOpen}
          onOpenChange={(isOpen) => {
            setIsEditModalOpen(isOpen);
            if (!isOpen) {
              setConceptToEdit(null); // Clear conceptToEdit when modal closes
            }
          }}
          conceptToEdit={conceptToEdit}
        />
      )}

      <ConfirmModal
        open={isConfirmModalOpen}
        onOpenChange={setIsConfirmModalOpen}
        title="Confirm Deletion"
        description="Are you sure you want to delete this concept? This action cannot be undone."
        onConfirm={executeDeleteConcept}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </>
  );
};

export default ConceptCacheList;
