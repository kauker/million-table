import { useRef  } from 'react'

const perPageOptions = [15, 30, 50, 100]

function TablePagination({
    page,
    totalPages,
    onChangePage,
    perPage,
    setPerPage,
}) {
    const goToPageInputRef = useRef(null)

    const onClickGoToPage = () => {
        const val = goToPageInputRef.current.value;
        const newPage = parseInt(val, 10);
        if (newPage >= 1 && newPage < totalPages) {
            onChangePage(newPage);
        }
        
        goToPageInputRef.current.value = '';
    }

    const onClickPrev = () => {
        if (page - 1 <  1) return
        onChangePage(page - 1);
    }

    const onClickNext = () => {
        if (page + 1 > totalPages) return
        onChangePage(page + 1);
    }

    return (
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
    )
}

export default TablePagination