import React from 'react';
import { GroupByOption } from '../types';

interface FilterBarProps {
  groupBy: GroupByOption;
  onGroupByChange: (option: GroupByOption) => void;
}

const FilterBar: React.FC<FilterBarProps> = ({ groupBy, onGroupByChange }) => {
  return (
    <div className="filter-bar">
      <div className="filter-bar-content">
        <label htmlFor="groupBy" className="filter-label">
          הצג לפי:
        </label>
        <select
          id="groupBy"
          value={groupBy}
          onChange={(e) => onGroupByChange(e.target.value as GroupByOption)}
          className="filter-select"
        >
          <option value="none">הצג הכל</option>
          <option value="user">לפי חברים</option>
          <option value="fund">לפי קופה</option>
        </select>
      </div>
    </div>
  );
};

export default FilterBar;
