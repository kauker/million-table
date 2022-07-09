import { useState, useEffect, useRef, useCallback  } from 'react'
import SWorker from 'simple-web-worker'
import { debounce } from 'lodash';
import { faker } from '@faker-js/faker';

import './style.css'

const actions = [
    { message: 'sorting', func: getSortedData },
    { message: 'filtering', func: getfilteredData },
    { message: 'func3', func: arg => `Worker 3: ${arg}` },
    { message: 'func4', func: (arg = 'Working on func4') => `Worker 4: ${arg}` }
]

let worker = SWorker.create(actions);

const MAX_ROWS = 1000000;
const CHUNK_LENGTH = 3000;
const perPageOptions = [15, 30, 50, 100]

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
    const [perPage, setPerPage] = useState(perPageOptions[0]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [sortParams, setSortParams] = useState({column: null, order: 'asc'});
    const [refreshing, setRefreshing] = useState(false);
    const goToPageInputRef = useRef(null)

    useEffect(() => {
        setPageRows(filteredRows.slice((page - 1) * perPage, page * perPage))
        setTotalPages(Math.ceil(filteredRows.length / perPage))
    }, [page, perPage, filteredRows])

    const onChangeSearchInput = (e) => {
        const { value } = e.target;
        setPage(1);
        setQuery(value)
        debouncedSearch(value);
    }

    const debouncedSearch = useCallback(debounce((query) => {
        setRefreshing(true)
        worker.postMessage('filtering', [rows, query])
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
                return worker.postMessage('filtering', [sortedArr, query])
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
                setRefreshing(false)
            } else {
                window.requestAnimationFrame(step);
            }
        }

        window.requestAnimationFrame(step);
        
    }

    const onClickGoToPage = () => {
        const val = goToPageInputRef.current.value;
        const newPage = parseInt(val, 10);
        if (newPage >= 1 && newPage < totalPages) {
            setPage(newPage);
        }
        
        goToPageInputRef.current.value = '';
    }

    const onClickPrev = () => {
        if (page - 1 <  1) return
        setPage(page - 1);
    }

    const onClickNext = () => {
        if (page + 1 > totalPages) return
        setPage(page + 1);
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
                            <th>Vehicle</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pageRows.map(u => <tr key={u.userId}>
                            <td>{u.userId}</td> 
                            <td>{u.username}</td>
                            <td>{u.email}</td>
                            <td>{u.birthdate.toLocaleDateString()}</td>
                            <td>{u.vehicle}</td>
                        </tr>)}
                    </tbody>
                </table>
                {refreshing && <div className="spinner-wrapper">
                    <div className="spinner-border text-secondary m-5">
                        <span className="sr-only"></span>
                    </div>
                </div>}
            </div>
            <div className="pagination d-flex mb-5">
                <div className="page-select d-flex">
                    <button className="btn btn-light me-2" onClick={onClickPrev}>Prev</button>
                    <span className="me-2 align-self-center">Page {page} of {totalPages}</span>
                    <button className="btn btn-light me-4" onClick={onClickNext}>Next</button>
                    <div className="d-flex">
                        <span className="me-2 align-self-center">Go to page:</span>
                        <div className="me-2">
                            <input 
                                type="number"
                                className="form-control"
                                ref={goToPageInputRef}
                            />
                        </div>
                    </div>
                    <div className="">
                        <button className="btn btn-light" onClick={onClickGoToPage}>Go</button>
                    </div>
                    
                </div>
                <div className="per-page ms-auto">
                    Rows per page: {perPageOptions.map(num => (
                        <button 
                            key={num} 
                            className={`btn ms-2 ${num === perPage ? 'btn-primary' : 'btn-light'}`}
                            onClick={() => setPerPage(num)}
                        >{num}</button>
                    ))}
                </div>
            </div> 
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

function getfilteredData(arr, query, pagination) {
    // const { page, perPage } = pagination;
    // const maxResults = page * perPage;
    // let count = 0;
    if (!query) {
        return arr
    }
    let filteredArr = [];
    for (let i = 0; i < arr.length; i++) {
        const item = arr[i];
        const keys = Object.keys(arr[i]);
        let isMatch = false;
        keys.forEach(key => {
            if (typeof item[key] === 'string' && item[key].toLowerCase().includes(query.toLowerCase())) {
                isMatch = true;
            }
        })
        if (isMatch) {
            filteredArr.push(item);
            // count++;
        }
        // if (count >= maxResults) {
        //     break;
        // }
    }

    return filteredArr
}