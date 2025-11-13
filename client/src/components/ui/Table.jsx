import { forwardRef } from 'react';
import { Card } from './Card';

const Table = forwardRef(({ className = '', children, ...props }, ref) => (
  <div ref={ref} className={`overflow-hidden ${className}`} {...props}>
    <div className="overflow-x-auto">
      <table className="w-full">
        {children}
      </table>
    </div>
  </div>
));

const TableHeader = forwardRef(({ className = '', children, ...props }, ref) => (
  <thead ref={ref} className={`bg-gray-50/50 ${className}`} {...props}>
    {children}
  </thead>
));

const TableBody = forwardRef(({ className = '', children, ...props }, ref) => (
  <tbody ref={ref} className={className} {...props}>
    {children}
  </tbody>
));

const TableRow = forwardRef(({ className = '', children, ...props }, ref) => (
  <tr 
    ref={ref} 
    className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${className}`} 
    {...props}
  >
    {children}
  </tr>
));

const TableHead = forwardRef(({ className = '', children, ...props }, ref) => (
  <th 
    ref={ref} 
    className={`text-left py-4 px-6 font-semibold text-gray-700 text-sm ${className}`} 
    {...props}
  >
    {children}
  </th>
));

const TableCell = forwardRef(({ className = '', children, ...props }, ref) => (
  <td ref={ref} className={`py-4 px-6 text-sm text-gray-600 ${className}`} {...props}>
    {children}
  </td>
));

Table.displayName = 'Table';
TableHeader.displayName = 'TableHeader';
TableBody.displayName = 'TableBody';
TableRow.displayName = 'TableRow';
TableHead.displayName = 'TableHead';
TableCell.displayName = 'TableCell';

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
