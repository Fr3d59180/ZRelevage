import React, { useState, useRef, useEffect } from 'react';
import { parseExcel, parseSheet } from '../utils/excelParser';

const TableManager: React.FC = () => {
    const [sheetNames, setSheetNames] = useState<string[]>([]);
    const [data, setData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string>(''); // Nom du fichier sans extension
    const [selectedSheet, setSelectedSheet] = useState<string>(''); // Feuille sélectionnée
    const [hiddenColumns, setHiddenColumns] = useState<string[]>([]); // Colonnes masquées
    const [columnColors, setColumnColors] = useState<{ [key: string]: string }>({}); // Couleurs des colonnes

    const [showSheets, setShowSheets] = useState<boolean>(true); // Afficher/Masquer les feuilles disponibles
    const [showColumnActions, setShowColumnActions] = useState<boolean>(true); // Afficher/Masquer les actions sur les colonnes

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({}); // Références pour les champs d'édition des colonnes

    // Fonction pour extraire le nom du fichier sans extension
    const extractFileName = (file: File): string => {
        const name = file.name;
        return name.substring(0, name.lastIndexOf('.')) || name;
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const { sheetNames } = await parseExcel(file);
            setSheetNames(sheetNames);
            setData([]);
            setError(null);
            setFileName(extractFileName(file)); // Met à jour le nom du fichier
        } catch (err) {
            setError('Erreur lors de l\'importation du fichier Excel.');
            console.error(err);
        }
    };

    const handleSheetSelect = async (sheetName: string) => {
        const file = fileInputRef.current?.files?.[0];
        if (!file) return;

        try {
            const sheetData = await parseSheet(file, sheetName);
            setData(sheetData);
            setHeaders(Object.keys(sheetData[0])); // Récupère les en-têtes
            setSelectedSheet(sheetName); // Met à jour la feuille sélectionnée
            setShowSheets(false); // Masque les feuilles disponibles
        } catch (err) {
            setError('Erreur lors de la sélection de la feuille.');
            console.error(err);
        }
    };

    // Met à jour le titre de la page dynamiquement
    useEffect(() => {
        if (fileName && selectedSheet) {
            document.title = `${fileName} - ${selectedSheet}`;
        } else if (fileName) {
            document.title = fileName;
        } else {
            document.title = 'Table Manager';
        }
    }, [fileName, selectedSheet]);

    const toggleColumnVisibility = (header: string) => {
        setHiddenColumns((prev) =>
            prev.includes(header) ? prev.filter((col) => col !== header) : [...prev, header]
        );
    };

    const changeColumnColor = (header: string, color: string) => {
        setColumnColors((prev) => ({ ...prev, [header]: color }));
    };

    const moveColumn = (header: string, direction: 'left' | 'right') => {
        const index = headers.indexOf(header);
        if (index === -1) return;

        const newHeaders = [...headers];
        const targetIndex = direction === 'left' ? index - 1 : index + 1;

        if (targetIndex >= 0 && targetIndex < headers.length) {
            [newHeaders[index], newHeaders[targetIndex]] = [newHeaders[targetIndex], newHeaders[index]];
            setHeaders(newHeaders);
        }
    };

    const editColumnName = (index: number, newName: string) => {
        const oldName = headers[index];
        const newHeaders = [...headers];
        newHeaders[index] = newName;

        // Met à jour les clés des objets dans `data`
        const newData = data.map((row) => {
            const updatedRow = { ...row };
            updatedRow[newName] = updatedRow[oldName];
            delete updatedRow[oldName];
            return updatedRow;
        });

        setHeaders(newHeaders);
        setData(newData);

        // Rétablit le focus sur le champ d'édition
        setTimeout(() => {
            inputRefs.current[newName]?.focus();
        }, 0);
    };

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleFileUpload}
                    ref={fileInputRef}
                    style={{ padding: '5px' }}
                />
                <button onClick={() => setShowSheets((prev) => !prev)}>
                    {showSheets ? 'Masquer les feuilles' : 'Afficher les feuilles'}
                </button>
                <button onClick={() => setShowColumnActions((prev) => !prev)}>
                    {showColumnActions ? 'Masquer les actions' : 'Afficher les actions'}
                </button>
            </div>

            {showSheets && sheetNames.length > 0 && (
                <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2 style={{ margin: 0 }}>Feuilles disponibles :</h2>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'nowrap', overflowX: 'auto' }}>
                        {sheetNames.map((sheetName) => (
                            <button
                                key={sheetName}
                                onClick={() => handleSheetSelect(sheetName)}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#007BFF',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {sheetName}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {showColumnActions && headers.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                    <h3 style={{ margin: 0 }}>Colonnes :</h3>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {headers.map((header, index) => (
                            <div key={header} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <input
                                    type="text"
                                    value={header}
                                    onChange={(e) => editColumnName(index, e.target.value)}
                                    ref={(el) => { inputRefs.current[header] = el; }}
                                    style={{ padding: '5px', border: '1px solid #ddd' }}
                                />
                                <button onClick={() => toggleColumnVisibility(header)}>
                                    {hiddenColumns.includes(header) ? 'Afficher' : 'Masquer'}
                                </button>
                                <input
                                    type="color"
                                    onChange={(e) => changeColumnColor(header, e.target.value)}
                                    value={columnColors[header] || '#ffffff'}
                                />
                                <button onClick={() => moveColumn(header, 'left')}>←</button>
                                <button onClick={() => moveColumn(header, 'right')}>→</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {data.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                    <h2>Données de la feuille sélectionnée :</h2>
                    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                        <thead>
                            <tr>
                                {headers.map(
                                    (header) =>
                                        !hiddenColumns.includes(header) && (
                                            <th
                                                key={header}
                                                style={{
                                                    border: '1px solid #ddd',
                                                    padding: '8px',
                                                    textAlign: 'left',
                                                    backgroundColor: columnColors[header] || 'transparent',
                                                }}
                                            >
                                                {header}
                                            </th>
                                        )
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                    {headers.map(
                                        (header) =>
                                            !hiddenColumns.includes(header) && (
                                                <td
                                                    key={header}
                                                    style={{
                                                        border: '1px solid #ddd',
                                                        padding: '8px',
                                                        backgroundColor: columnColors[header] || 'transparent',
                                                    }}
                                                >
                                                    <input
                                                        type="text"
                                                        value={row[header] || ''}
                                                        onChange={(e) =>
                                                            setData((prev) => {
                                                                const newData = [...prev];
                                                                newData[rowIndex][header] = e.target.value;
                                                                return newData;
                                                            })
                                                        }
                                                    />
                                                </td>
                                            )
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default TableManager;