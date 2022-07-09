import { useState, useEffect, useCallback  } from 'react'
import SWorker from 'simple-web-worker'
import { debounce } from 'lodash';
import { faker } from '@faker-js/faker';
import Select from 'react-select';

import './style.css'
import TablePagination from './TablePagination';

const actions = [
    { message: 'sorting', func: getSortedData },
    { message: 'filtering', func: getfilteredData },
    { message: 'getFilterFields', func: getFilterFields },
]

let worker = SWorker.create(actions);

const MAX_ROWS = 1000000;
const CHUNK_LENGTH = 3000;

const sortableColumns = [
    { name: 'userId', label: 'Id'},
    { name: 'username', label: 'Username'},
    { name: 'email', label: 'Email'},
    { name: 'birthdate', label: 'Birthdate'},
]

function TableComponent() {
    const [rows, setRows] = useState([]);
    const [filteredRows, setFilteredRows] = useState([]);
    const [pageRows, setPageRows] = useState([]);
    const [query, setQuery] = useState('');
    const [perPage, setPerPage] = useState(15);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [sortParams, setSortParams] = useState({column: null, order: 'asc'});
    const [filterParams, setFilterParams] = useState({column: 'vehicle', value: ''});
    const [refreshing, setRefreshing] = useState(false);
    const [filterValues, setFilterValues] = useState([]);
    

    useEffect(() => {
        setPageRows(filteredRows.slice((page - 1) * perPage, page * perPage))
        setTotalPages(Math.ceil(filteredRows.length / perPage))
    }, [page, perPage, filteredRows])

    const onChangeSearchInput = (e) => {
        const { value } = e.target;
        setPage(1);
        setQuery(value)
        debouncedSearch(value, filterParams);
    }

    const debouncedSearch = useCallback(debounce((query, filterParams) => {
        setRefreshing(true)
        worker.postMessage('filtering', [rows, query, filterParams])
        .then(filteredArr => {
            setFilteredRows(filteredArr)
            setRefreshing(false)
        })
        .catch(console.error)
    }, 600), [rows])

    const onClickHeaderCell = (name) => {
        const { column, order } = sortParams;

        let newSort = {};
        if (column === name) {
            newSort = {
                column: name,
                order: order === 'asc' ? 'desc' : 'asc'
            }
        } else {
            newSort = {
                column : name,
                order: 'asc'
            }
        }

        setSortParams(newSort);
        setRefreshing(true)

        setTimeout(() => {
            worker.postMessage('sorting', [rows, newSort])
            .then(sortedArr => {
                setRows(sortedArr);
                return worker.postMessage('filtering', [sortedArr, query, filterParams])
            })
            .then(filteredArr => {
                setFilteredRows(filteredArr)
                setRefreshing(false)
                
            })
            .catch(console.error)
        }, 100)
        
    }

    const onClickGenerate = () => {
        setPage(1);
        setQuery('');
        setSortParams({column: null, order: 'asc'});
        setRefreshing(true)

        let users = [];

        function step() {
            const usersChunk = getUsers(CHUNK_LENGTH);
            users = [...users, ...usersChunk];

            if (users.length >= MAX_ROWS) {
                setRows(users);
                setFilteredRows(users)

                worker.postMessage('getFilterFields', [users, 'vehicle'])
                .then(filterVals => {
                    setFilterValues(filterVals.map(v => ({label: v, value: v})))
                    setRefreshing(false)
                })
            } else {
                window.requestAnimationFrame(step);
            }
        }

        window.requestAnimationFrame(step);
        
    }

    const onChangePage = (page) => setPage(page);

    const onSelectChange = (opt) => {
        const value = opt ? opt.value : '';
        const newFilterParams = {
            ...filterParams,
            value
        }
        setFilterParams(newFilterParams)

        debouncedSearch(query, newFilterParams);
    }

    return (
        <div className="table-component">
            <button 
                className="btn btn-danger my-4" 
                onClick={onClickGenerate}
            >Generate data</button>
            <div className="search-box d-flex mb-3">
                <label htmlFor="search" className="form-label align-self-center mb-0 me-4">Search</label>
                <div className="">
                    <input 
                        type="text" 
                        className="form-control" 
                        id="search" 
                        value={query}
                        onChange={onChangeSearchInput}
                    />
                </div>
            </div>  
            <div className="table-wrapper mb-4">
                <table className="table">
                    <thead>
                        <tr>
                            {sortableColumns.map(col => <th key={col.name} onClick={() => onClickHeaderCell(col.name)}>
                                <span className="me-2">{col.label}</span>
                                {col.name === sortParams.column ? 
                                    sortParams.order === 'asc' ? <span>&uarr;</span>
                                    : <span>&darr;</span>
                                : null}
                            </th>)}
                            <th>
                                Vehicle
                                <Select
                                    className="basic-single"
                                    classNamePrefix="select"
                                    isClearable
                                    isSearchable
                                    name="vehicle"
                                    options={filterValues}
                                    onChange={onSelectChange}
                                />
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                    {pageRows.length ? 
                        pageRows.map(u => <tr key={u.userId}>
                            <td>{u.userId}</td> 
                            <td>{u.username}</td>
                            <td>{u.email}</td>
                            <td>{u.birthdate.toLocaleDateString()}</td>
                            <td>{u.vehicle}</td>
                        </tr>)
                        : 
                        <tr><td className="text-center" colSpan={5}>No results</td></tr> 
                    }
                    </tbody>
                    
                </table>
                {refreshing && <div className="spinner-wrapper">
                    <div className="spinner-border text-secondary m-5">
                        <span className="sr-only"></span>
                    </div>
                </div>}
            </div>

            <TablePagination 
                page={page} 
                totalPages={totalPages}
                onChangePage={onChangePage}
                perPage={perPage}
                setPerPage={setPerPage}
            />
            
        </div>
    )

}

export default TableComponent


function createRandomUser(faker) {
    return {
      userId: faker.datatype.uuid(),
      username: faker.internet.userName(),
      email: faker.internet.email(),
      birthdate: faker.date.birthdate(),
      vehicle: faker.vehicle.model()
    };
}

function getUsers(count) {
    let users = []
    Array.from({ length: count }).forEach((e, i) => {
        users.push(createRandomUser(faker));
    });

    return users
}

function getSortedData(arr, sortParams) {
    const { column, order } = sortParams;

    const sortedArr = arr.sort((a, b) => order === 'asc' ? a[column].localeCompare(b[column]) : b[column].localeCompare(a[column]));

    return sortedArr
}

function getfilteredData(arr, query, filterParams) {
    const { column, value } = filterParams;

    if (!query && !value) {
        return arr
    }

    let filteredArr = [];
    for (let i = 0; i < arr.length; i++) {
        const item = arr[i];
        const keys = Object.keys(arr[i]);
        let queryMatch = false;
        keys.forEach(key => {
            if (!queryMatch) {
                queryMatch = typeof item[key] === 'string' && item[key].toLowerCase().includes(query.toLowerCase());
            }
        })

        let filterMatch = value ? item[column] === value : true;
        let isMatch = queryMatch && filterMatch;

        if (isMatch) {
            filteredArr.push(item);
        }
    }

    return filteredArr
}

function getFilterFields(arr, column) {
    let uniqueItems = new Set();

    arr.forEach(v => uniqueItems.add(v[column]));

    return [...uniqueItems]

}