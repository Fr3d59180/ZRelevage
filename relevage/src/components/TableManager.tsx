import React, { useState, useRef } from 'react';
import { parseExcel, parseSheet } from '../utils/excelParser';

const TableManager: React.FC = () => {
    const [sheetNames, setSheetNames] = useState<string[]>([]);
    const [data, setData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]); // Nouveaux en-têtes
    const [error, setError] = useState<string | null>(null);
    const [hiddenColumns, setHiddenColumns] = useState<string[]>([]); // Colonnes masquées
    const [showActions, setShowActions] = useState<boolean>(true); // État pour afficher/masquer les actions
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [columnColors, setColumnColors] = useState<Record<string, { min: number; max: number }>>({});

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const { sheetNames } = await parseExcel(file);
            setSheetNames(sheetNames);
            setData([]);
            setError(null);
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
            setHiddenColumns([]); // Réinitialise les colonnes masquées
            setError(null);
        } catch (err) {
            setError(`Erreur lors du chargement de la feuille "${sheetName}".`);
            console.error(err);
        }
    };

    const handleHeaderAction = (action: string, headerName?: string, newHeaderName?: string) => {
        switch (action) {
            case 'hidde':
                if (headerName) {
                    setHiddenColumns((prevHiddenColumns) =>
                        prevHiddenColumns.includes(headerName)
                            ? prevHiddenColumns.filter((col) => col !== headerName) // Unhide column
                            : [...prevHiddenColumns, headerName] // Hide column
                    );
                }
                break;
            case 'modify':
                setHeaders((prevHeaders) =>
                    prevHeaders.map((header) => (header === headerName && newHeaderName ? newHeaderName : header))
                );
                setData((prevData) =>
                    prevData.map((row) => {
                        if (headerName && newHeaderName) {
                            const { [headerName]: value, ...rest } = row; // Destructure to remove the old header
                            return { ...rest, [newHeaderName]: value }; // Add the new header with the value
                        }
                        return row; // Return the row unchanged if headerName or newHeaderName is undefined
                    })
                );
                break;
            case 'add':
                if (newHeaderName) {
                    setHeaders((prevHeaders) => [...prevHeaders, newHeaderName]);
                    setData((prevData) =>
                        prevData.map((row) => ({ ...row, [newHeaderName]: '' }))
                    );
                }
                break;
            default:
                break;
        }
    };

    const handleMoveColumn = (headerName: string, direction: 'left' | 'right') => {
        setHeaders((prevHeaders) => {
            const index = prevHeaders.indexOf(headerName);
            if (index === -1) return prevHeaders;

            const newHeaders = [...prevHeaders];
            const targetIndex = direction === 'left' ? index - 1 : index + 1;

            if (targetIndex >= 0 && targetIndex < newHeaders.length) {
                // Swap the columns
                [newHeaders[index], newHeaders[targetIndex]] = [newHeaders[targetIndex], newHeaders[index]];
            }
            return newHeaders;
        });

        setData((prevData) =>
            prevData.map((row) => {
                const newRow: Record<string, any> = {};
                const keys = Object.keys(row);

                const reorderedKeys = [...keys];
                const index = reorderedKeys.indexOf(headerName);
                const targetIndex = direction === 'left' ? index - 1 : index + 1;

                if (index !== -1 && targetIndex >= 0 && targetIndex < reorderedKeys.length) {
                    // Swap the keys
                    [reorderedKeys[index], reorderedKeys[targetIndex]] = [reorderedKeys[targetIndex], reorderedKeys[index]];
                }

                reorderedKeys.forEach((key) => {
                    newRow[key] = row[key];
                });

                return newRow;
            })
        );
    };

    const handleAddColumn = (clickedHeader: string) => {
        setHeaders((prevHeaders) => {
            const index = prevHeaders.indexOf(clickedHeader);
            if (index === -1) return prevHeaders;

            const newHeaders = [...prevHeaders];
            newHeaders.splice(index, 0, `New Column ${index}`);
            return newHeaders;
        });
    };

    const handleAddColumnEnd = (clickedHeader: string) => {
        setHeaders((prevHeaders) => {
            const index = prevHeaders.indexOf(clickedHeader);
            if (index === -1) return prevHeaders;

            const newHeaders = [...prevHeaders];
            newHeaders.splice(index + 1, 0, `New Column ${index + 1}`);
            return newHeaders;
        });

        setData((prevData) =>
            prevData.map((row) => {
                const newRow: Record<string, any> = {};
                const keys = Object.keys(row);
                keys.forEach((key, idx) => {
                    if (idx === keys.indexOf(clickedHeader)) {
                        newRow[`New Column ${idx}`] = 0; // Default value
                    }
                    newRow[key] = row[key];
                });
                return newRow;
            })
        );
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
    };

    const handleSort = (key: string) => {
        setSortConfig((prevSortConfig) => {
            if (prevSortConfig && prevSortConfig.key === key) {
                // Toggle sort direction
                return {
                    key,
                    direction: prevSortConfig.direction === 'asc' ? 'desc' : 'asc',
                };
            }
            // Default to ascending order
            return { key, direction: 'asc' };
        });
    };

    const handleColorizeColumn = (header: string) => {
        const minMax = filteredData.reduce(
            (acc, row) => {
                const value = parseFloat(row[header]);
                if (!isNaN(value)) {
                    acc.min = Math.min(acc.min, value);
                    acc.max = Math.max(acc.max, value);
                }
                return acc;
            },
            { min: Infinity, max: -Infinity }
        );

        setColumnColors((prevColors) => ({
            ...prevColors,
            [header]: minMax,
        }));
    };

    const handleToggleColorizeColumn = (header: string) => {
        setColumnColors((prevColors) => {
            if (prevColors[header]) {
                // Remove colorization if it already exists
                const { [header]: _, ...rest } = prevColors;
                return rest;
            } else {
                // Add colorization
                const minMax = data.reduce(
                    (acc, row) => {
                        const value = parseFloat(row[header]);
                        if (!isNaN(value)) {
                            acc.min = Math.min(acc.min, value);
                            acc.max = Math.max(acc.max, value);
                        }
                        return acc;
                    },
                    { min: Infinity, max: -Infinity }
                );
                return {
                    ...prevColors,
                    [header]: minMax,
                };
            }
        });
    };

    const filteredData = data.filter((row) =>
        Object.values(row).some((value) =>
            value && value.toString().toLowerCase().includes(searchQuery.toLowerCase())
        )
    );

    const sortedData = React.useMemo(() => {
        if (!sortConfig) return filteredData;

        const { key, direction } = sortConfig;
        return [...filteredData].sort((a, b) => {
            const aValue = a[key] || '';
            const bValue = b[key] || '';

            if (aValue < bValue) return direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredData, sortConfig]);

    const renderHeaderActions = () => (
        <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ margin: 0 }}>Actions sur les en-têtes :</h3>
                <button
                    onClick={() => setShowActions((prev) => !prev)}
                    style={{ padding: '5px 10px', backgroundColor: '#007BFF', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                >
                    Toggle
                </button>
                <hr style={{ width: '100%', border: '1px solid #ccc' }} />
            </div>
            {showActions && (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {headers.map((header) => (
                        <div key={header} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            &nbsp;
                            &nbsp;
                            <button
                                onClick={() => {
                                    const newHeaderName = prompt(`Modifier l'en-tête "${header}" :`, header);
                                    if (newHeaderName) handleHeaderAction('modify', header, newHeaderName);
                                }}
                                style={{
                                    padding: '5px 10px',
                                    backgroundColor: '#007BFF',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                }}
                            >
                                MOd
                            </button>
                            <button
                                onClick={() => handleHeaderAction('hidde', header)}
                                style={{
                                    padding: '5px 10px',
                                    backgroundColor: hiddenColumns.includes(header) ? '#d3d3d3' : '#FF5733',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                }}
                            >
                                {hiddenColumns.includes(header) ? 'View' : 'Hidd'}
                            </button>
                            <button
                                onClick={() => handleToggleColorizeColumn(header)}
                                style={{ padding: '5px 10px', backgroundColor: '#D3D3D3', color: 'black', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                            >
                                {columnColors[header] ? 'Remove Colorization' : 'Colorize'}
                            </button>
                            <span>{header}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderTable = () => (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
                <tr>
                    {headers
                        .filter((header) => !hiddenColumns.includes(header))
                        .map((header, index) => (
                            <th key={header} style={{ fontSize: '1.2em', fontWeight: 'bold', textDecoration: 'underline', fontFamily: 'Arial, sans-serif', textTransform: 'uppercase' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <div>
                                        {showActions && (
                                            <div>
                                                <button onClick={() => {
                                                        const newHeaderName = prompt(`Modifier l'en-tête \"${header}\" :`, header);
                                                        if (newHeaderName) handleHeaderAction('modify', header, newHeaderName);
                                                    }}
                                                >
                                                    M
                                                </button>
                                                <button onClick={() => handleAddColumn(header)}>+</button>
                                                <button onClick={() => handleMoveColumn(header, 'left')}>←</button>
                                                <button onClick={() => handleMoveColumn(header, 'right')}>→</button>
                                                {index === headers.length - 1 && (
                                                    <button onClick={() => handleAddColumnEnd(header)}>+</button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span>{header}</span>
                                        <button
                                            onClick={() => handleSort(header)}
                                            style={{ padding: '2px 5px', marginLeft: '5px', backgroundColor: '#007BFF', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
                                        >
                                            ⇅
                                        </button>
                                    </div>
                                </div>
                            </th>
                        ))}
                </tr>
            </thead>
            <tbody>
                {sortedData.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                        {headers
                            .filter((header) => !hiddenColumns.includes(header))
                            .map((header) => (
                                <td
                                    key={header}
                                    style={{
                                        border: '1px solid black',
                                        textAlign: 'center',
                                        backgroundColor: (() => {
                                            const range = columnColors[header];
                                            if (range && typeof row[header] === 'number') {
                                                const value = row[header];
                                                const ratio = (value - range.min) / (range.max - range.min);
                                                const red = Math.round(255 * (1 - ratio));
                                                const green = Math.round(255 * ratio);
                                                return `rgb(${red}, ${green}, 200)`;
                                            }
                                            return 'transparent';
                                        })(),
                                    }}
                                >
                                    {row[header]}
                                </td>
                            ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );

    const renderSheetSelector = () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>Feuilles disponibles:</span>
            {sheetNames.map((sheetName) => (
                <button
                    key={sheetName}
                    onClick={() => handleSheetSelect(sheetName)}
                    style={{ padding: '5px 10px', cursor: 'pointer' }}
                >
                    {sheetName}
                </button>
            ))}
        </div>
    );

    return (
        <div style={{ padding: '20px' }}>
            {/* <h1 style={{ textAlign: 'center' }}>Gestionnaire de Tableaux Excel</h1> */}
            <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                ref={fileInputRef}
            />
            {error && <p style={{ color: 'red' }}>{error}</p>}

            {sheetNames.length > 0 && (
                <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2 style={{ margin: 0 }}>Feuilles disponibles :</h2>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'nowrap', overflowX: 'auto' }}>
                        {sheetNames.map(sheetName => (
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

            {headers.length > 0 && renderHeaderActions()}

            {data.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                    <h2>Données de la feuille sélectionnée :</h2>
                    <div style={{ marginBottom: '20px' }}>
                        <input
                            type="text"
                            placeholder="Rechercher une valeur..."
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            style={{ padding: '5px', width: '100%', border: '1px solid #ccc', borderRadius: '5px' }}
                        />
                    </div>
                    {renderTable()}
                </div>
            )}
        </div>
    );
};

export default TableManager;